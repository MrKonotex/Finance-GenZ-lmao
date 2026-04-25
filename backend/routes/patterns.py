import uuid
import json
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Pattern, Trade
from schemas import PatternCreate, PatternUpdate

router = APIRouter()


def _serialize(p: Pattern) -> dict:
    d = {c.name: getattr(p, c.name) for c in p.__table__.columns}
    for field in ("timeframes", "screenshots"):
        if isinstance(d.get(field), str):
            try:
                d[field] = json.loads(d[field])
            except Exception:
                pass
    return d


@router.get("", response_model=List[dict])
async def list_patterns(db: Session = Depends(get_db)):
    """List all patterns."""
    patterns = db.query(Pattern).order_by(Pattern.created_at.asc()).all()
    return [_serialize(p) for p in patterns]


@router.get("/{pattern_id}", response_model=dict)
async def get_pattern(pattern_id: str, db: Session = Depends(get_db)):
    """Get a single pattern with linked trade stats."""
    pattern = db.query(Pattern).filter(Pattern.id == pattern_id).first()
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")

    data = _serialize(pattern)

    # Compute trade stats for this pattern
    trades = db.query(Trade).filter(Trade.pattern_id == pattern_id).all()
    pnls = [t.pnl or 0 for t in trades]
    r_vals = [t.r_multiple for t in trades if t.r_multiple is not None]
    wins = [p for p in pnls if p > 0]

    data["trade_stats"] = {
        "total_trades": len(trades),
        "win_rate": round(len(wins) / len(pnls) * 100, 2) if pnls else 0,
        "avg_r": round(sum(r_vals) / len(r_vals), 3) if r_vals else 0,
        "total_pnl": round(sum(pnls), 4),
    }
    return data


@router.post("", response_model=dict, status_code=201)
async def create_pattern(payload: PatternCreate, db: Session = Depends(get_db)):
    """Create a new pattern."""
    pattern = Pattern(
        id=str(uuid.uuid4()),
        name=payload.name,
        description=payload.description,
        entry_criteria=payload.entry_criteria,
        exit_criteria=payload.exit_criteria,
        invalidation=payload.invalidation,
        timeframes=(
            json.dumps(payload.timeframes) if payload.timeframes is not None else None
        ),
        screenshots=(
            json.dumps(payload.screenshots) if payload.screenshots is not None else None
        ),
        notes=payload.notes,
        created_at=datetime.utcnow(),
    )
    db.add(pattern)
    db.commit()
    db.refresh(pattern)
    return _serialize(pattern)


@router.put("/{pattern_id}", response_model=dict)
async def update_pattern(
    pattern_id: str, payload: PatternUpdate, db: Session = Depends(get_db)
):
    """Update an existing pattern."""
    pattern = db.query(Pattern).filter(Pattern.id == pattern_id).first()
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")
    data = payload.model_dump(exclude_unset=True)
    for key, val in data.items():
        if key in ("timeframes", "screenshots") and val is not None:
            val = json.dumps(val)
        setattr(pattern, key, val)
    db.commit()
    db.refresh(pattern)
    return _serialize(pattern)


@router.delete("/{pattern_id}", status_code=204)
async def delete_pattern(pattern_id: str, db: Session = Depends(get_db)):
    """Delete a pattern."""
    pattern = db.query(Pattern).filter(Pattern.id == pattern_id).first()
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")
    db.delete(pattern)
    db.commit()
