import uuid
import json
from datetime import date, datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import JournalEntry, Trade, MissedSetup
from schemas import (
    JournalEntryCreate,
    JournalEntryUpdate,
    JournalEntryOut,
    TradeCreate,
    TradeUpdate,
    TradeOut,
    MissedSetupCreate,
    MissedSetupOut,
)

router = APIRouter()


def _serialize_journal(entry: JournalEntry) -> dict:
    d = {c.name: getattr(entry, c.name) for c in entry.__table__.columns}
    if isinstance(d.get("mistakes"), str):
        try:
            d["mistakes"] = json.loads(d["mistakes"])
        except Exception:
            pass
    return d


def _serialize_trade(trade: Trade) -> dict:
    d = {c.name: getattr(trade, c.name) for c in trade.__table__.columns}
    if isinstance(d.get("rule_violations"), str):
        try:
            d["rule_violations"] = json.loads(d["rule_violations"])
        except Exception:
            pass
    return d


def _serialize_missed(ms: MissedSetup) -> dict:
    return {c.name: getattr(ms, c.name) for c in ms.__table__.columns}


# ─── Journal entries ─────────────────────────────────────────────────────────

@router.get("", response_model=List[dict])
async def list_journal_entries(
    month: Optional[str] = Query(None, description="YYYY-MM"),
    db: Session = Depends(get_db),
):
    """List all journal entries for a month (for calendar view)."""
    q = db.query(JournalEntry)
    if month:
        try:
            year, mon = map(int, month.split("-"))
            from calendar import monthrange
            _, last_day = monthrange(year, mon)
            start = date(year, mon, 1)
            end = date(year, mon, last_day)
            q = q.filter(JournalEntry.date >= start, JournalEntry.date <= end)
        except Exception:
            raise HTTPException(status_code=400, detail="month must be YYYY-MM")
    entries = q.order_by(JournalEntry.date.asc()).all()
    return [_serialize_journal(e) for e in entries]


@router.get("/{entry_date}", response_model=dict)
async def get_journal_entry(entry_date: str, db: Session = Depends(get_db)):
    """Get journal entry for a specific date (YYYY-MM-DD)."""
    try:
        d = date.fromisoformat(entry_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")
    entry = db.query(JournalEntry).filter(JournalEntry.date == d).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    return _serialize_journal(entry)


@router.post("", response_model=dict, status_code=201)
async def create_or_update_journal(payload: JournalEntryCreate, db: Session = Depends(get_db)):
    """Create or update a journal entry."""
    existing = db.query(JournalEntry).filter(JournalEntry.date == payload.date).first()
    if existing:
        # Update instead of creating duplicate
        data = payload.model_dump(exclude_unset=True, exclude={"date"})
        for key, val in data.items():
            if key == "mistakes" and isinstance(val, list):
                val = json.dumps(val)
            setattr(existing, key, val)
        db.commit()
        db.refresh(existing)
        return _serialize_journal(existing)

    entry = JournalEntry(
        id=str(uuid.uuid4()),
        date=payload.date,
        market_context=payload.market_context,
        game_plan=payload.game_plan,
        daily_pnl=payload.daily_pnl,
        mood=payload.mood,
        confidence=payload.confidence,
        mistakes=json.dumps(payload.mistakes) if payload.mistakes is not None else None,
        psych_notes=payload.psych_notes,
        bias_direction=payload.bias_direction,
        bias_timeframe=payload.bias_timeframe,
        bias_confidence=payload.bias_confidence,
        bias_note=payload.bias_note,
        created_at=datetime.utcnow(),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _serialize_journal(entry)


@router.put("/{entry_date}", response_model=dict)
async def update_journal_entry(
    entry_date: str, payload: JournalEntryUpdate, db: Session = Depends(get_db)
):
    """Update an existing journal entry."""
    try:
        d = date.fromisoformat(entry_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")
    entry = db.query(JournalEntry).filter(JournalEntry.date == d).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    data = payload.model_dump(exclude_unset=True)
    for key, val in data.items():
        if key == "mistakes" and isinstance(val, list):
            val = json.dumps(val)
        setattr(entry, key, val)
    db.commit()
    db.refresh(entry)
    return _serialize_journal(entry)


# ─── Trades under a journal date ─────────────────────────────────────────────

@router.get("/{entry_date}/trades", response_model=List[dict])
async def get_trades_for_date(entry_date: str, db: Session = Depends(get_db)):
    """Get all trades logged under a specific journal date."""
    try:
        d = date.fromisoformat(entry_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")
    entry = db.query(JournalEntry).filter(JournalEntry.date == d).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    trades = db.query(Trade).filter(Trade.journal_entry_id == entry.id).all()
    return [_serialize_trade(t) for t in trades]


@router.post("/{entry_date}/trades", response_model=dict, status_code=201)
async def add_trade_to_journal(
    entry_date: str, payload: TradeCreate, db: Session = Depends(get_db)
):
    """Add a trade to a date's journal."""
    try:
        d = date.fromisoformat(entry_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")
    entry = db.query(JournalEntry).filter(JournalEntry.date == d).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    trade = Trade(
        id=str(uuid.uuid4()),
        journal_entry_id=entry.id,
        asset=payload.asset,
        direction=payload.direction,
        entry_price=payload.entry_price,
        exit_price=payload.exit_price,
        size=payload.size,
        pnl=payload.pnl,
        r_multiple=payload.r_multiple,
        pattern_id=payload.pattern_id,
        setup_thesis=payload.setup_thesis,
        execution_notes=payload.execution_notes,
        chart_screenshot=payload.chart_screenshot,
        entry_time=payload.entry_time,
        exit_time=payload.exit_time,
        session=payload.session,
        followed_rules=payload.followed_rules,
        rule_violations=(
            json.dumps(payload.rule_violations)
            if payload.rule_violations is not None
            else None
        ),
        created_at=datetime.utcnow(),
    )
    db.add(trade)
    # Update journal daily_pnl aggregate
    if payload.pnl is not None:
        existing_pnl = entry.daily_pnl or 0.0
        entry.daily_pnl = existing_pnl + payload.pnl
    db.commit()
    db.refresh(trade)
    return _serialize_trade(trade)


@router.put("/trades/{trade_id}", response_model=dict)
async def update_trade(trade_id: str, payload: TradeUpdate, db: Session = Depends(get_db)):
    """Update a trade."""
    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    data = payload.model_dump(exclude_unset=True)
    for key, val in data.items():
        if key == "rule_violations" and isinstance(val, list):
            val = json.dumps(val)
        setattr(trade, key, val)
    db.commit()
    db.refresh(trade)
    return _serialize_trade(trade)


@router.delete("/trades/{trade_id}", status_code=204)
async def delete_trade(trade_id: str, db: Session = Depends(get_db)):
    """Delete a trade."""
    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    db.delete(trade)
    db.commit()


# ─── Missed setups ────────────────────────────────────────────────────────────

@router.post("/{entry_date}/missed_setups", response_model=dict, status_code=201)
async def log_missed_setup(
    entry_date: str, payload: MissedSetupCreate, db: Session = Depends(get_db)
):
    """Log a missed setup for a journal date."""
    try:
        d = date.fromisoformat(entry_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")
    entry = db.query(JournalEntry).filter(JournalEntry.date == d).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    ms = MissedSetup(
        id=str(uuid.uuid4()),
        journal_entry_id=entry.id,
        asset=payload.asset,
        pattern_id=payload.pattern_id,
        reason_passed=payload.reason_passed,
        potential_r=payload.potential_r,
        chart_screenshot=payload.chart_screenshot,
        created_at=datetime.utcnow(),
    )
    db.add(ms)
    db.commit()
    db.refresh(ms)
    return _serialize_missed(ms)


@router.get("/{entry_date}/missed_setups", response_model=List[dict])
async def get_missed_setups(entry_date: str, db: Session = Depends(get_db)):
    """Get missed setups for a journal date."""
    try:
        d = date.fromisoformat(entry_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")
    entry = db.query(JournalEntry).filter(JournalEntry.date == d).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    setups = db.query(MissedSetup).filter(MissedSetup.journal_entry_id == entry.id).all()
    return [_serialize_missed(s) for s in setups]
