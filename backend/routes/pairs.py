import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Pair
from schemas import PairCreate, PairUpdate
from services.binance import get_klines

router = APIRouter()


def _serialize(p: Pair) -> dict:
    return {c.name: getattr(p, c.name) for c in p.__table__.columns}


@router.get("", response_model=List[dict])
async def list_pairs(db: Session = Depends(get_db)):
    """List all tracked pairs."""
    pairs = db.query(Pair).all()
    return [_serialize(p) for p in pairs]


@router.post("", response_model=dict, status_code=201)
async def add_pair(payload: PairCreate, db: Session = Depends(get_db)):
    """Add a new pair."""
    pair = Pair(
        id=str(uuid.uuid4()),
        asset_a=payload.asset_a,
        asset_b=payload.asset_b,
        lookback_days=payload.lookback_days or 60,
        notes=payload.notes,
        active=payload.active if payload.active is not None else True,
    )
    db.add(pair)
    db.commit()
    db.refresh(pair)
    return _serialize(pair)


@router.put("/{pair_id}", response_model=dict)
async def update_pair(pair_id: str, payload: PairUpdate, db: Session = Depends(get_db)):
    """Update a pair."""
    pair = db.query(Pair).filter(Pair.id == pair_id).first()
    if not pair:
        raise HTTPException(status_code=404, detail="Pair not found")
    data = payload.model_dump(exclude_unset=True)
    for key, val in data.items():
        setattr(pair, key, val)
    db.commit()
    db.refresh(pair)
    return _serialize(pair)


@router.delete("/{pair_id}", status_code=204)
async def delete_pair(pair_id: str, db: Session = Depends(get_db)):
    """Delete a pair."""
    pair = db.query(Pair).filter(Pair.id == pair_id).first()
    if not pair:
        raise HTTPException(status_code=404, detail="Pair not found")
    db.delete(pair)
    db.commit()


@router.get("/{pair_id}/spread")
async def pair_spread(pair_id: str, db: Session = Depends(get_db)):
    """
    Return spread ratio history and z-score for a pair.
    Fetches daily klines from Binance and computes ratio = close_A / close_B.
    """
    pair = db.query(Pair).filter(Pair.id == pair_id).first()
    if not pair:
        raise HTTPException(status_code=404, detail="Pair not found")

    symbol_a = f"{pair.asset_a.upper()}USDT"
    symbol_b = f"{pair.asset_b.upper()}USDT"
    limit = pair.lookback_days or 60

    klines_a, klines_b = await _fetch_both(symbol_a, symbol_b, limit)

    if not klines_a or not klines_b:
        return {
            "pair_id": pair_id,
            "asset_a": pair.asset_a,
            "asset_b": pair.asset_b,
            "spread": [],
            "current_z_score": None,
            "error": "Could not fetch price data from Binance",
        }

    # Align by length
    min_len = min(len(klines_a), len(klines_b))
    klines_a = klines_a[-min_len:]
    klines_b = klines_b[-min_len:]

    ratios = []
    for ka, kb in zip(klines_a, klines_b):
        if kb["close"] != 0:
            ratios.append(
                {
                    "open_time": ka["open_time"],
                    "ratio": ka["close"] / kb["close"],
                }
            )

    if not ratios:
        return {"pair_id": pair_id, "spread": [], "current_z_score": None}

    ratio_vals = [r["ratio"] for r in ratios]
    mean = sum(ratio_vals) / len(ratio_vals)
    variance = sum((x - mean) ** 2 for x in ratio_vals) / len(ratio_vals)
    std = variance ** 0.5

    z_score = (ratio_vals[-1] - mean) / std if std > 0 else 0.0

    for r in ratios:
        r["z_score"] = round((r["ratio"] - mean) / std, 4) if std > 0 else 0.0

    return {
        "pair_id": pair_id,
        "asset_a": pair.asset_a,
        "asset_b": pair.asset_b,
        "mean_ratio": round(mean, 6),
        "std_ratio": round(std, 6),
        "current_z_score": round(z_score, 4),
        "spread": ratios,
    }


@router.get("/{pair_id}/correlation")
async def pair_correlation(pair_id: str, db: Session = Depends(get_db)):
    """Return rolling correlation over the lookback_days window."""
    pair = db.query(Pair).filter(Pair.id == pair_id).first()
    if not pair:
        raise HTTPException(status_code=404, detail="Pair not found")

    symbol_a = f"{pair.asset_a.upper()}USDT"
    symbol_b = f"{pair.asset_b.upper()}USDT"
    limit = (pair.lookback_days or 60) + 1  # extra day for returns

    klines_a, klines_b = await _fetch_both(symbol_a, symbol_b, limit)

    if len(klines_a) < 2 or len(klines_b) < 2:
        return {
            "pair_id": pair_id,
            "asset_a": pair.asset_a,
            "asset_b": pair.asset_b,
            "correlation": None,
            "error": "Insufficient data",
        }

    min_len = min(len(klines_a), len(klines_b))
    klines_a = klines_a[-min_len:]
    klines_b = klines_b[-min_len:]

    # Compute daily log returns
    import math

    def log_returns(klines):
        closes = [k["close"] for k in klines]
        return [math.log(closes[i] / closes[i - 1]) for i in range(1, len(closes))]

    ret_a = log_returns(klines_a)
    ret_b = log_returns(klines_b)

    if not ret_a or not ret_b:
        return {"pair_id": pair_id, "correlation": None}

    n = min(len(ret_a), len(ret_b))
    ret_a = ret_a[-n:]
    ret_b = ret_b[-n:]

    mean_a = sum(ret_a) / n
    mean_b = sum(ret_b) / n
    cov = sum((ret_a[i] - mean_a) * (ret_b[i] - mean_b) for i in range(n)) / n
    std_a = (sum((x - mean_a) ** 2 for x in ret_a) / n) ** 0.5
    std_b = (sum((x - mean_b) ** 2 for x in ret_b) / n) ** 0.5

    correlation = cov / (std_a * std_b) if std_a > 0 and std_b > 0 else 0.0

    return {
        "pair_id": pair_id,
        "asset_a": pair.asset_a,
        "asset_b": pair.asset_b,
        "lookback_days": pair.lookback_days,
        "correlation": round(correlation, 4),
        "data_points": n,
    }


async def _fetch_both(symbol_a: str, symbol_b: str, limit: int):
    """Helper to fetch klines for two symbols concurrently."""
    import asyncio

    klines_a, klines_b = await asyncio.gather(
        get_klines(symbol_a, "1d", limit),
        get_klines(symbol_b, "1d", limit),
        return_exceptions=True,
    )
    if isinstance(klines_a, Exception):
        klines_a = []
    if isinstance(klines_b, Exception):
        klines_b = []
    return klines_a, klines_b
