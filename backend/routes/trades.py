import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Trade, JournalEntry

router = APIRouter()


def _serialize_trade(trade: Trade) -> dict:
    d = {c.name: getattr(trade, c.name) for c in trade.__table__.columns}
    if isinstance(d.get("rule_violations"), str):
        try:
            d["rule_violations"] = json.loads(d["rule_violations"])
        except Exception:
            pass
    return d


@router.get("", response_model=List[dict])
async def list_trades(
    asset: Optional[str] = Query(None),
    direction: Optional[str] = Query(None),
    pattern_id: Optional[str] = Query(None),
    session: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None, description="YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="YYYY-MM-DD"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List trades with optional filters."""
    from datetime import date, datetime

    q = db.query(Trade)

    if asset:
        q = q.filter(Trade.asset.ilike(f"%{asset}%"))
    if direction:
        q = q.filter(Trade.direction == direction)
    if pattern_id:
        q = q.filter(Trade.pattern_id == pattern_id)
    if session:
        q = q.filter(Trade.session == session)
    if date_from or date_to:
        # Filter by journal entry date
        q = q.join(JournalEntry, Trade.journal_entry_id == JournalEntry.id, isouter=True)
        if date_from:
            try:
                df = date.fromisoformat(date_from)
                q = q.filter(JournalEntry.date >= df)
            except ValueError:
                raise HTTPException(status_code=400, detail="date_from must be YYYY-MM-DD")
        if date_to:
            try:
                dt = date.fromisoformat(date_to)
                q = q.filter(JournalEntry.date <= dt)
            except ValueError:
                raise HTTPException(status_code=400, detail="date_to must be YYYY-MM-DD")

    total = q.count()
    trades = q.order_by(Trade.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "trades": [_serialize_trade(t) for t in trades],
    }


@router.get("/{trade_id}", response_model=dict)
async def get_trade(trade_id: str, db: Session = Depends(get_db)):
    """Get a single trade by ID."""
    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return _serialize_trade(trade)
