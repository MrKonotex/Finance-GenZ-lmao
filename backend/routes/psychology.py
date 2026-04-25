import json
from typing import Optional
from datetime import date
from collections import defaultdict
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import JournalEntry

router = APIRouter()


@router.get("/history")
async def mood_history(
    date_from: Optional[str] = Query(None, alias="from"),
    date_to: Optional[str] = Query(None, alias="to"),
    db: Session = Depends(get_db),
):
    """Return mood/confidence history over time from journal entries."""
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

    history = [
        {
            "date": e.date.isoformat(),
            "mood": e.mood,
            "confidence": e.confidence,
            "daily_pnl": e.daily_pnl,
            "bias_direction": e.bias_direction,
        }
        for e in entries
    ]
    return {"history": history}


@router.get("/pnl_mood_correlation")
async def pnl_mood_correlation(db: Session = Depends(get_db)):
    """Pearson correlation between mood score and daily P&L."""
    entries = (
        db.query(JournalEntry)
        .filter(
            JournalEntry.mood.isnot(None),
            JournalEntry.daily_pnl.isnot(None),
        )
        .all()
    )

    if len(entries) < 2:
        return {"correlation": None, "sample_size": len(entries)}

    moods = [e.mood for e in entries]
    pnls = [e.daily_pnl for e in entries]
    n = len(moods)

    mean_m = sum(moods) / n
    mean_p = sum(pnls) / n

    cov = sum((moods[i] - mean_m) * (pnls[i] - mean_p) for i in range(n)) / n
    std_m = (sum((x - mean_m) ** 2 for x in moods) / n) ** 0.5
    std_p = (sum((x - mean_p) ** 2 for x in pnls) / n) ** 0.5

    corr = cov / (std_m * std_p) if std_m > 0 and std_p > 0 else 0.0

    # Confidence correlation as well
    conf_entries = [e for e in entries if e.confidence is not None]
    conf_corr = None
    if len(conf_entries) >= 2:
        confs = [e.confidence for e in conf_entries]
        cpnls = [e.daily_pnl for e in conf_entries]
        nc = len(confs)
        mean_c = sum(confs) / nc
        mean_cp = sum(cpnls) / nc
        cov_c = sum((confs[i] - mean_c) * (cpnls[i] - mean_cp) for i in range(nc)) / nc
        std_c = (sum((x - mean_c) ** 2 for x in confs) / nc) ** 0.5
        std_cp = (sum((x - mean_cp) ** 2 for x in cpnls) / nc) ** 0.5
        conf_corr = round(cov_c / (std_c * std_cp), 4) if std_c > 0 and std_cp > 0 else 0.0

    return {
        "mood_pnl_correlation": round(corr, 4),
        "confidence_pnl_correlation": conf_corr,
        "sample_size": n,
        "interpretation": (
            "positive" if corr > 0.2
            else "negative" if corr < -0.2
            else "neutral"
        ),
    }


@router.get("/mistake_frequency")
async def mistake_frequency(db: Session = Depends(get_db)):
    """Count of each mistake type across all journal entries."""
    entries = db.query(JournalEntry).filter(JournalEntry.mistakes.isnot(None)).all()

    counts: dict = defaultdict(int)
    for e in entries:
        try:
            mistakes = (
                json.loads(e.mistakes) if isinstance(e.mistakes, str) else e.mistakes
            )
            if isinstance(mistakes, list):
                for m in mistakes:
                    counts[m] += 1
        except Exception:
            pass

    sorted_mistakes = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    return {
        "mistake_frequency": [
            {"mistake": m, "count": c} for m, c in sorted_mistakes
        ],
        "total_entries_with_mistakes": len(entries),
    }


@router.get("/best_worst_days")
async def best_worst_days(db: Session = Depends(get_db)):
    """Conditions (mood, confidence, bias) on best vs worst trading days."""
    entries = (
        db.query(JournalEntry)
        .filter(JournalEntry.daily_pnl.isnot(None))
        .order_by(JournalEntry.daily_pnl.desc())
        .all()
    )

    if not entries:
        return {"best_days": [], "worst_days": []}

    def _fmt(e: JournalEntry) -> dict:
        return {
            "date": e.date.isoformat(),
            "daily_pnl": e.daily_pnl,
            "mood": e.mood,
            "confidence": e.confidence,
            "bias_direction": e.bias_direction,
            "bias_confidence": e.bias_confidence,
            "psych_notes": e.psych_notes,
        }

    n = max(1, min(5, len(entries) // 5))
    best = entries[:n]
    worst = entries[-n:][::-1]

    # Avg stats for best/worst
    def _avg_stat(group, field):
        vals = [getattr(e, field) for e in group if getattr(e, field) is not None]
        return round(sum(vals) / len(vals), 2) if vals else None

    return {
        "best_days": [_fmt(e) for e in best],
        "worst_days": [_fmt(e) for e in worst],
        "best_days_avg_mood": _avg_stat(best, "mood"),
        "best_days_avg_confidence": _avg_stat(best, "confidence"),
        "worst_days_avg_mood": _avg_stat(worst, "mood"),
        "worst_days_avg_confidence": _avg_stat(worst, "confidence"),
    }
