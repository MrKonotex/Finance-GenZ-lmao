from typing import Optional
from datetime import date, timedelta
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import JournalEntry, Trade

router = APIRouter()


def _compute_summary(entries, trades) -> dict:
    """Compute aggregate stats for a set of journal entries + trades."""
    pnls_daily = [e.daily_pnl or 0 for e in entries]
    total_pnl = sum(pnls_daily)

    trade_pnls = [t.pnl or 0 for t in trades]
    r_vals = [t.r_multiple for t in trades if t.r_multiple is not None]
    wins = [p for p in trade_pnls if p > 0]
    losses = [p for p in trade_pnls if p < 0]

    # Max drawdown
    cumulative = 0.0
    peak = 0.0
    max_dd = 0.0
    for p in pnls_daily:
        cumulative += p
        if cumulative > peak:
            peak = cumulative
        dd = peak - cumulative
        if dd > max_dd:
            max_dd = dd

    moods = [e.mood for e in entries if e.mood is not None]
    confs = [e.confidence for e in entries if e.confidence is not None]

    mistakes: dict = defaultdict(int)
    import json
    for e in entries:
        if e.mistakes:
            try:
                ms = json.loads(e.mistakes) if isinstance(e.mistakes, str) else e.mistakes
                if isinstance(ms, list):
                    for m in ms:
                        mistakes[m] += 1
            except Exception:
                pass

    return {
        "trading_days": len(entries),
        "total_trades": len(trades),
        "total_pnl": round(total_pnl, 4),
        "win_rate": round(len(wins) / len(trade_pnls) * 100, 2) if trade_pnls else 0,
        "avg_r": round(sum(r_vals) / len(r_vals), 3) if r_vals else 0,
        "avg_daily_pnl": round(total_pnl / len(entries), 4) if entries else 0,
        "max_drawdown": round(max_dd, 4),
        "avg_mood": round(sum(moods) / len(moods), 2) if moods else None,
        "avg_confidence": round(sum(confs) / len(confs), 2) if confs else None,
        "top_mistakes": sorted(mistakes.items(), key=lambda x: x[1], reverse=True)[:5],
        "best_day_pnl": max(pnls_daily) if pnls_daily else None,
        "worst_day_pnl": min(pnls_daily) if pnls_daily else None,
    }


@router.get("/weekly")
async def weekly_review(
    week: Optional[str] = Query(None, description="YYYY-WNN (e.g. 2024-W03)"),
    db: Session = Depends(get_db),
):
    """Weekly stats summary."""
    if week:
        try:
            year_str, week_str = week.split("-W")
            year = int(year_str)
            week_num = int(week_str)
            # ISO week: Monday is start
            start = date.fromisocalendar(year, week_num, 1)
            end = date.fromisocalendar(year, week_num, 7)
        except Exception:
            raise HTTPException(status_code=400, detail="week must be YYYY-WNN")
    else:
        today = date.today()
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)

    entries = (
        db.query(JournalEntry)
        .filter(JournalEntry.date >= start, JournalEntry.date <= end)
        .all()
    )
    entry_ids = [e.id for e in entries]
    trades = (
        db.query(Trade).filter(Trade.journal_entry_id.in_(entry_ids)).all()
        if entry_ids
        else []
    )

    summary = _compute_summary(entries, trades)
    summary["period"] = "weekly"
    summary["start_date"] = start.isoformat()
    summary["end_date"] = end.isoformat()
    summary["week"] = week or start.strftime("%Y-W%V")
    return summary


@router.get("/monthly")
async def monthly_review(
    month: Optional[str] = Query(None, description="YYYY-MM"),
    db: Session = Depends(get_db),
):
    """Monthly stats summary."""
    if month:
        try:
            year, mon = map(int, month.split("-"))
            from calendar import monthrange
            _, last_day = monthrange(year, mon)
            start = date(year, mon, 1)
            end = date(year, mon, last_day)
        except Exception:
            raise HTTPException(status_code=400, detail="month must be YYYY-MM")
    else:
        today = date.today()
        from calendar import monthrange
        _, last_day = monthrange(today.year, today.month)
        start = date(today.year, today.month, 1)
        end = date(today.year, today.month, last_day)

    entries = (
        db.query(JournalEntry)
        .filter(JournalEntry.date >= start, JournalEntry.date <= end)
        .all()
    )
    entry_ids = [e.id for e in entries]
    trades = (
        db.query(Trade).filter(Trade.journal_entry_id.in_(entry_ids)).all()
        if entry_ids
        else []
    )

    summary = _compute_summary(entries, trades)
    summary["period"] = "monthly"
    summary["start_date"] = start.isoformat()
    summary["end_date"] = end.isoformat()
    summary["month"] = month or start.strftime("%Y-%m")
    return summary
