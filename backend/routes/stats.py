import json
from typing import Optional, List
from datetime import date, datetime, timedelta
from collections import defaultdict
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Trade, JournalEntry

router = APIRouter()


def _get_trades_in_range(db: Session, date_from: Optional[str], date_to: Optional[str]):
    q = db.query(Trade).join(JournalEntry, Trade.journal_entry_id == JournalEntry.id, isouter=True)
    if date_from:
        try:
            q = q.filter(JournalEntry.date >= date.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            q = q.filter(JournalEntry.date <= date.fromisoformat(date_to))
        except ValueError:
            pass
    return q.all()


def _avg_hold_minutes(trades: list, winners: bool) -> Optional[float]:
    durations = []
    for t in trades:
        is_winner = (t.pnl or 0) > 0
        if is_winner != winners:
            continue
        if t.entry_time and t.exit_time:
            delta = (t.exit_time - t.entry_time).total_seconds() / 60
            if delta >= 0:
                durations.append(delta)
    return round(sum(durations) / len(durations), 2) if durations else None


@router.get("/equity_curve")
async def equity_curve(
    date_from: Optional[str] = Query(None, alias="from"),
    date_to: Optional[str] = Query(None, alias="to"),
    db: Session = Depends(get_db),
):
    """Return daily P&L and cumulative equity curve."""
    q = db.query(JournalEntry)
    if date_from:
        try:
            q = q.filter(JournalEntry.date >= date.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            q = q.filter(JournalEntry.date <= date.fromisoformat(date_to))
        except ValueError:
            pass
    entries = q.order_by(JournalEntry.date.asc()).all()
    cumulative = 0.0
    result = []
    for e in entries:
        daily = e.daily_pnl or 0.0
        cumulative += daily
        result.append(
            {
                "date": e.date.isoformat(),
                "daily_pnl": daily,
                "cumulative_pnl": round(cumulative, 4),
            }
        )
    return {"equity_curve": result}


@router.get("/summary")
async def stats_summary(
    date_from: Optional[str] = Query(None, alias="from"),
    date_to: Optional[str] = Query(None, alias="to"),
    db: Session = Depends(get_db),
):
    """Overall trading statistics."""
    trades = _get_trades_in_range(db, date_from, date_to)
    if not trades:
        return {
            "total_trades": 0,
            "win_rate": 0,
            "avg_r": 0,
            "total_pnl": 0,
            "max_drawdown": 0,
            "best_trade": None,
            "worst_trade": None,
            "avg_hold_time_winners_min": None,
            "avg_hold_time_losers_min": None,
        }

    pnls = [t.pnl or 0.0 for t in trades]
    r_multiples = [t.r_multiple for t in trades if t.r_multiple is not None]
    winners = [p for p in pnls if p > 0]
    win_rate = round(len(winners) / len(pnls) * 100, 2) if pnls else 0

    # Max drawdown
    cumulative = 0.0
    peak = 0.0
    max_dd = 0.0
    for p in pnls:
        cumulative += p
        if cumulative > peak:
            peak = cumulative
        dd = peak - cumulative
        if dd > max_dd:
            max_dd = dd

    best = max(trades, key=lambda t: t.pnl or 0)
    worst = min(trades, key=lambda t: t.pnl or 0)

    return {
        "total_trades": len(trades),
        "win_rate": win_rate,
        "avg_r": round(sum(r_multiples) / len(r_multiples), 3) if r_multiples else 0,
        "total_pnl": round(sum(pnls), 4),
        "max_drawdown": round(max_dd, 4),
        "best_trade": {"id": best.id, "asset": best.asset, "pnl": best.pnl},
        "worst_trade": {"id": worst.id, "asset": worst.asset, "pnl": worst.pnl},
        "avg_hold_time_winners_min": _avg_hold_minutes(trades, winners=True),
        "avg_hold_time_losers_min": _avg_hold_minutes(trades, winners=False),
    }


@router.get("/by_pattern")
async def stats_by_pattern(db: Session = Depends(get_db)):
    """Win rate and avg R grouped by pattern."""
    from models import Pattern

    trades = db.query(Trade).filter(Trade.pattern_id.isnot(None)).all()
    patterns_map = {p.id: p.name for p in db.query(Pattern).all()}

    grouped: dict = defaultdict(list)
    for t in trades:
        grouped[t.pattern_id].append(t)

    result = []
    for pid, group in grouped.items():
        pnls = [t.pnl or 0 for t in group]
        r_vals = [t.r_multiple for t in group if t.r_multiple is not None]
        wins = [p for p in pnls if p > 0]
        result.append(
            {
                "pattern_id": pid,
                "pattern_name": patterns_map.get(pid, pid),
                "total_trades": len(group),
                "win_rate": round(len(wins) / len(pnls) * 100, 2) if pnls else 0,
                "avg_r": round(sum(r_vals) / len(r_vals), 3) if r_vals else 0,
                "total_pnl": round(sum(pnls), 4),
            }
        )
    return {"by_pattern": sorted(result, key=lambda x: x["total_trades"], reverse=True)}


@router.get("/by_asset")
async def stats_by_asset(db: Session = Depends(get_db)):
    """Win rate and avg R grouped by asset."""
    trades = db.query(Trade).all()
    grouped: dict = defaultdict(list)
    for t in trades:
        grouped[t.asset].append(t)

    result = []
    for asset, group in grouped.items():
        pnls = [t.pnl or 0 for t in group]
        r_vals = [t.r_multiple for t in group if t.r_multiple is not None]
        wins = [p for p in pnls if p > 0]
        result.append(
            {
                "asset": asset,
                "total_trades": len(group),
                "win_rate": round(len(wins) / len(pnls) * 100, 2) if pnls else 0,
                "avg_r": round(sum(r_vals) / len(r_vals), 3) if r_vals else 0,
                "total_pnl": round(sum(pnls), 4),
            }
        )
    return {"by_asset": sorted(result, key=lambda x: x["total_pnl"], reverse=True)}


@router.get("/by_direction")
async def stats_by_direction(db: Session = Depends(get_db)):
    """Long vs short comparison."""
    trades = db.query(Trade).all()
    grouped: dict = defaultdict(list)
    for t in trades:
        key = t.direction or "unknown"
        grouped[key].append(t)

    result = {}
    for direction, group in grouped.items():
        pnls = [t.pnl or 0 for t in group]
        r_vals = [t.r_multiple for t in group if t.r_multiple is not None]
        wins = [p for p in pnls if p > 0]
        result[direction] = {
            "total_trades": len(group),
            "win_rate": round(len(wins) / len(pnls) * 100, 2) if pnls else 0,
            "avg_r": round(sum(r_vals) / len(r_vals), 3) if r_vals else 0,
            "total_pnl": round(sum(pnls), 4),
        }
    return {"by_direction": result}


@router.get("/by_session")
async def stats_by_session(db: Session = Depends(get_db)):
    """Asia / Europe / US session performance."""
    trades = db.query(Trade).all()
    grouped: dict = defaultdict(list)
    for t in trades:
        key = t.session or "unknown"
        grouped[key].append(t)

    result = {}
    for sess, group in grouped.items():
        pnls = [t.pnl or 0 for t in group]
        r_vals = [t.r_multiple for t in group if t.r_multiple is not None]
        wins = [p for p in pnls if p > 0]
        result[sess] = {
            "total_trades": len(group),
            "win_rate": round(len(wins) / len(pnls) * 100, 2) if pnls else 0,
            "avg_r": round(sum(r_vals) / len(r_vals), 3) if r_vals else 0,
            "total_pnl": round(sum(pnls), 4),
        }
    return {"by_session": result}


@router.get("/by_hour")
async def stats_by_hour(db: Session = Depends(get_db)):
    """Hourly P&L heatmap (0-23) based on entry_time."""
    trades = db.query(Trade).filter(Trade.entry_time.isnot(None)).all()
    hourly: dict = defaultdict(list)
    for t in trades:
        hour = t.entry_time.hour
        hourly[hour].append(t.pnl or 0)

    result = []
    for hour in range(24):
        pnls = hourly.get(hour, [])
        wins = [p for p in pnls if p > 0]
        result.append(
            {
                "hour": hour,
                "total_trades": len(pnls),
                "total_pnl": round(sum(pnls), 4),
                "win_rate": round(len(wins) / len(pnls) * 100, 2) if pnls else 0,
            }
        )
    return {"by_hour": result}


@router.get("/by_day_of_week")
async def stats_by_day_of_week(db: Session = Depends(get_db)):
    """Mon-Sun performance from journal entries."""
    entries = db.query(JournalEntry).all()
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    grouped: dict = defaultdict(list)
    for e in entries:
        dow = e.date.weekday()  # 0=Monday
        grouped[dow].append(e.daily_pnl or 0)

    result = []
    for dow in range(7):
        pnls = grouped.get(dow, [])
        result.append(
            {
                "day": day_names[dow],
                "day_index": dow,
                "trading_days": len(pnls),
                "total_pnl": round(sum(pnls), 4),
                "avg_pnl": round(sum(pnls) / len(pnls), 4) if pnls else 0,
            }
        )
    return {"by_day_of_week": result}


@router.get("/r_distribution")
async def r_distribution(db: Session = Depends(get_db)):
    """Histogram buckets of R multiples."""
    trades = db.query(Trade).filter(Trade.r_multiple.isnot(None)).all()
    r_vals = [t.r_multiple for t in trades]

    if not r_vals:
        return {"r_distribution": [], "total": 0}

    # Buckets: <-3, -3:-2, -2:-1, -1:0, 0:1, 1:2, 2:3, >3
    buckets = [
        {"label": "< -3R", "min": float("-inf"), "max": -3},
        {"label": "-3R to -2R", "min": -3, "max": -2},
        {"label": "-2R to -1R", "min": -2, "max": -1},
        {"label": "-1R to 0R", "min": -1, "max": 0},
        {"label": "0R to 1R", "min": 0, "max": 1},
        {"label": "1R to 2R", "min": 1, "max": 2},
        {"label": "2R to 3R", "min": 2, "max": 3},
        {"label": "> 3R", "min": 3, "max": float("inf")},
    ]

    for b in buckets:
        b["count"] = sum(1 for r in r_vals if b["min"] <= r < b["max"])
        del b["min"]
        del b["max"]

    return {"r_distribution": buckets, "total": len(r_vals)}


@router.get("/streaks")
async def streaks(db: Session = Depends(get_db)):
    """Current streak, longest win streak, worst loss streak."""
    entries = (
        db.query(JournalEntry)
        .order_by(JournalEntry.date.asc())
        .all()
    )

    current_streak = 0
    current_streak_type = None
    max_win_streak = 0
    max_loss_streak = 0
    temp_win = 0
    temp_loss = 0

    for e in entries:
        pnl = e.daily_pnl or 0
        if pnl > 0:
            temp_win += 1
            temp_loss = 0
            max_win_streak = max(max_win_streak, temp_win)
        elif pnl < 0:
            temp_loss += 1
            temp_win = 0
            max_loss_streak = max(max_loss_streak, temp_loss)
        else:
            temp_win = 0
            temp_loss = 0

    if entries:
        last_pnl = entries[-1].daily_pnl or 0
        if last_pnl > 0:
            current_streak = temp_win
            current_streak_type = "win"
        elif last_pnl < 0:
            current_streak = temp_loss
            current_streak_type = "loss"
        else:
            current_streak = 0
            current_streak_type = "neutral"

    return {
        "current_streak": current_streak,
        "current_streak_type": current_streak_type,
        "longest_win_streak": max_win_streak,
        "worst_loss_streak": max_loss_streak,
    }


@router.get("/rule_adherence")
async def rule_adherence(
    date_from: Optional[str] = Query(None, alias="from"),
    date_to: Optional[str] = Query(None, alias="to"),
    db: Session = Depends(get_db),
):
    """Percentage of trades that followed rules + most broken rules."""
    trades = _get_trades_in_range(db, date_from, date_to)
    if not trades:
        return {"followed_rules_pct": 0, "total_trades": 0, "most_broken_rules": []}

    followed = [t for t in trades if t.followed_rules is True]
    followed_pct = round(len(followed) / len(trades) * 100, 2)

    # Count violations
    violation_counts: dict = defaultdict(int)
    for t in trades:
        if t.rule_violations:
            try:
                violations = (
                    json.loads(t.rule_violations)
                    if isinstance(t.rule_violations, str)
                    else t.rule_violations
                )
                if isinstance(violations, list):
                    for v in violations:
                        violation_counts[v] += 1
            except Exception:
                pass

    sorted_violations = sorted(violation_counts.items(), key=lambda x: x[1], reverse=True)

    return {
        "followed_rules_pct": followed_pct,
        "total_trades": len(trades),
        "trades_followed": len(followed),
        "most_broken_rules": [
            {"rule": rule, "count": count} for rule, count in sorted_violations[:10]
        ],
    }


@router.get("/hall_of_fame")
async def hall_of_fame(db: Session = Depends(get_db)):
    """Top 5 best and worst trades."""
    trades = db.query(Trade).filter(Trade.pnl.isnot(None)).order_by(Trade.pnl.desc()).all()

    def _fmt(t: Trade) -> dict:
        return {
            "id": t.id,
            "asset": t.asset,
            "direction": t.direction,
            "pnl": t.pnl,
            "r_multiple": t.r_multiple,
            "entry_time": t.entry_time.isoformat() if t.entry_time else None,
            "exit_time": t.exit_time.isoformat() if t.exit_time else None,
            "setup_thesis": t.setup_thesis,
        }

    return {
        "best_trades": [_fmt(t) for t in trades[:5]],
        "worst_trades": [_fmt(t) for t in trades[-5:][::-1]],
    }
