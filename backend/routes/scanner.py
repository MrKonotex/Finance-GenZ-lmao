import uuid
import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import ScannerSignal, Pair
from schemas import WebhookPayload
from services.hyperliquid import get_funding_rates, get_all_mids
from services.binance import get_klines

router = APIRouter()


def _serialize_signal(s: ScannerSignal) -> dict:
    d = {c.name: getattr(s, c.name) for c in s.__table__.columns}
    if isinstance(d.get("payload"), str):
        try:
            d["payload"] = json.loads(d["payload"])
        except Exception:
            pass
    return d


@router.get("/signals")
async def get_signals(limit: int = 50, db: Session = Depends(get_db)):
    """Return recent scanner signals for the card grid."""
    signals = (
        db.query(ScannerSignal)
        .order_by(ScannerSignal.created_at.desc())
        .limit(limit)
        .all()
    )
    return {"signals": [_serialize_signal(s) for s in signals]}


@router.post("/webhook", response_model=dict, status_code=201)
async def scanner_webhook(payload: WebhookPayload, db: Session = Depends(get_db)):
    """TradingView alert ingestion endpoint."""
    signal = ScannerSignal(
        id=str(uuid.uuid4()),
        source="tradingview",
        signal_type=payload.signal_type or "custom",
        asset=payload.ticker or "",
        message=payload.message or "",
        payload=json.dumps(payload.model_dump()),
        created_at=datetime.utcnow(),
    )
    db.add(signal)
    db.commit()
    db.refresh(signal)
    return {
        "id": signal.id,
        "status": "received",
        "asset": signal.asset,
        "signal_type": signal.signal_type,
        "created_at": signal.created_at.isoformat(),
    }


@router.get("/funding_extremes")
async def funding_extreme_signals():
    """
    Return funding rate extreme signals.
    Assets where funding is unusually high or low (potential fade setups).
    Threshold: |funding_rate| > 0.05% per 8h.
    """
    rates = await get_funding_rates()
    if not rates:
        return {"signals": []}

    threshold = 0.0005  # 0.05% per 8h
    signals = []

    for r in rates:
        fr = r.get("funding_rate", 0)
        if abs(fr) >= threshold:
            direction = "short_funding_fade" if fr > 0 else "long_funding_fade"
            signals.append(
                {
                    "asset": r["asset"],
                    "funding_rate": fr,
                    "funding_rate_pct": round(fr * 100, 4),
                    "open_interest": r.get("open_interest"),
                    "mark_price": r.get("mark_price"),
                    "signal_type": "funding_extreme",
                    "direction": direction,
                    "note": (
                        f"Extreme {'positive' if fr > 0 else 'negative'} funding — "
                        f"consider {'short' if fr > 0 else 'long'} bias fade"
                    ),
                }
            )

    signals.sort(key=lambda x: abs(x["funding_rate"]), reverse=True)
    return {"signals": signals, "threshold_pct": threshold * 100}


@router.get("/breakouts")
async def breakout_signals():
    """
    Scan for breakout signals based on 20-period high/low on daily candles.
    Checks a set of major crypto assets against Binance data.
    """
    watch_assets = [
        "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT",
        "AVAXUSDT", "LINKUSDT", "DOTUSDT", "ADAUSDT",
    ]

    import asyncio

    async def check_breakout(symbol: str) -> dict | None:
        klines = await get_klines(symbol, "1d", 21)
        if len(klines) < 21:
            return None
        recent = klines[-21:-1]  # last 20 candles (excluding today)
        current = klines[-1]

        high_20 = max(k["high"] for k in recent)
        low_20 = min(k["low"] for k in recent)
        current_close = current["close"]

        if current_close > high_20:
            return {
                "asset": symbol.replace("USDT", ""),
                "signal_type": "breakout",
                "direction": "bullish",
                "current_price": current_close,
                "breakout_level": high_20,
                "breakout_pct": round((current_close - high_20) / high_20 * 100, 2),
                "note": f"20-day high breakout at {high_20:.4f}",
            }
        elif current_close < low_20:
            return {
                "asset": symbol.replace("USDT", ""),
                "signal_type": "breakout",
                "direction": "bearish",
                "current_price": current_close,
                "breakout_level": low_20,
                "breakout_pct": round((current_close - low_20) / low_20 * 100, 2),
                "note": f"20-day low breakdown at {low_20:.4f}",
            }
        return None

    results = await asyncio.gather(*[check_breakout(s) for s in watch_assets], return_exceptions=True)
    signals = [r for r in results if r is not None and not isinstance(r, Exception)]
    return {"signals": signals}


@router.get("/pair_divergence")
async def pair_divergence_signals(db: Session = Depends(get_db)):
    """
    Scan tracked pairs for divergence (z-score extremes).
    Pairs with |z-score| > 2 are flagged as potential mean-reversion setups.
    """
    pairs = db.query(Pair).filter(Pair.active == True).all()
    if not pairs:
        return {"signals": []}

    import asyncio
    import math

    async def check_pair(pair: Pair) -> dict | None:
        symbol_a = f"{pair.asset_a.upper()}USDT"
        symbol_b = f"{pair.asset_b.upper()}USDT"
        limit = pair.lookback_days or 60

        klines_a, klines_b = await asyncio.gather(
            get_klines(symbol_a, "1d", limit),
            get_klines(symbol_b, "1d", limit),
            return_exceptions=True,
        )
        if isinstance(klines_a, Exception) or isinstance(klines_b, Exception):
            return None
        if len(klines_a) < 10 or len(klines_b) < 10:
            return None

        min_len = min(len(klines_a), len(klines_b))
        klines_a = klines_a[-min_len:]
        klines_b = klines_b[-min_len:]

        ratios = [
            ka["close"] / kb["close"]
            for ka, kb in zip(klines_a, klines_b)
            if kb["close"] != 0
        ]
        if len(ratios) < 10:
            return None

        mean = sum(ratios) / len(ratios)
        std = (sum((r - mean) ** 2 for r in ratios) / len(ratios)) ** 0.5
        if std == 0:
            return None

        z = (ratios[-1] - mean) / std

        if abs(z) >= 2.0:
            direction = (
                f"short {pair.asset_a}/long {pair.asset_b}"
                if z > 0
                else f"long {pair.asset_a}/short {pair.asset_b}"
            )
            return {
                "pair_id": pair.id,
                "asset_a": pair.asset_a,
                "asset_b": pair.asset_b,
                "z_score": round(z, 4),
                "current_ratio": round(ratios[-1], 6),
                "mean_ratio": round(mean, 6),
                "signal_type": "pair_divergence",
                "direction": direction,
                "note": (
                    f"Z-score {z:.2f} — {pair.asset_a}/{pair.asset_b} "
                    f"{'stretched high' if z > 0 else 'stretched low'}, mean-revert trade"
                ),
            }
        return None

    results = await asyncio.gather(*[check_pair(p) for p in pairs], return_exceptions=True)
    signals = [r for r in results if r is not None and not isinstance(r, Exception)]
    signals.sort(key=lambda x: abs(x["z_score"]), reverse=True)
    return {"signals": signals}
