import uuid
import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Watchlist
from schemas import WatchlistCreate, WatchlistUpdate
from services.hyperliquid import get_all_mids
from services.binance import get_price as binance_get_price

router = APIRouter()


def _serialize(item: Watchlist) -> dict:
    d = {c.name: getattr(item, c.name) for c in item.__table__.columns}
    if isinstance(d.get("key_levels"), str):
        try:
            d["key_levels"] = json.loads(d["key_levels"])
        except Exception:
            pass
    return d


@router.get("", response_model=List[dict])
async def list_watchlist(db: Session = Depends(get_db)):
    """Return full watchlist."""
    items = db.query(Watchlist).order_by(Watchlist.priority.desc(), Watchlist.created_at.asc()).all()
    return [_serialize(i) for i in items]


@router.post("", response_model=dict, status_code=201)
async def add_watchlist_item(payload: WatchlistCreate, db: Session = Depends(get_db)):
    """Add an item to the watchlist."""
    item = Watchlist(
        id=str(uuid.uuid4()),
        asset=payload.asset,
        asset_type=payload.asset_type or "crypto",
        key_levels=(
            json.dumps(payload.key_levels)
            if payload.key_levels is not None
            else None
        ),
        notes=payload.notes,
        priority=payload.priority or 0,
        created_at=datetime.utcnow(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _serialize(item)


@router.put("/{item_id}", response_model=dict)
async def update_watchlist_item(
    item_id: str, payload: WatchlistUpdate, db: Session = Depends(get_db)
):
    """Update a watchlist item."""
    item = db.query(Watchlist).filter(Watchlist.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    data = payload.model_dump(exclude_unset=True)
    for key, val in data.items():
        if key == "key_levels" and val is not None:
            val = json.dumps(val)
        setattr(item, key, val)
    db.commit()
    db.refresh(item)
    return _serialize(item)


@router.delete("/{item_id}", status_code=204)
async def delete_watchlist_item(item_id: str, db: Session = Depends(get_db)):
    """Remove an item from the watchlist."""
    item = db.query(Watchlist).filter(Watchlist.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    db.delete(item)
    db.commit()


@router.get("/with_prices", response_model=List[dict])
async def watchlist_with_prices(db: Session = Depends(get_db)):
    """Return watchlist with current prices from Hyperliquid (crypto) or Binance fallback."""
    items = db.query(Watchlist).order_by(Watchlist.priority.desc()).all()
    if not items:
        return []

    # Fetch all HL mids once
    hl_mids: dict = {}
    try:
        hl_mids = await get_all_mids()
    except Exception:
        pass

    result = []
    for item in items:
        data = _serialize(item)
        price: Optional[float] = None
        asset_upper = item.asset.upper()

        if item.asset_type == "crypto":
            # Try HL first
            price = hl_mids.get(asset_upper)
            if price is None:
                # Try Binance USDT pair
                try:
                    price = await binance_get_price(f"{asset_upper}USDT")
                except Exception:
                    pass
            if price is not None:
                price = float(price)
        elif item.asset_type == "equity":
            try:
                from services.yfinance_service import get_stock_price
                price = await get_stock_price(item.asset)
            except Exception:
                pass

        data["current_price"] = price
        result.append(data)

    return result
