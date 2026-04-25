from typing import Optional
from fastapi import APIRouter, Query
from services.hyperliquid import get_funding_rates, get_funding_history

router = APIRouter()


@router.get("/rates")
async def current_funding_rates():
    """Return current funding rates for all Hyperliquid perps."""
    rates = await get_funding_rates()
    # Sort by absolute funding rate descending
    rates_sorted = sorted(rates, key=lambda x: abs(x.get("funding_rate", 0)), reverse=True)
    return {"rates": rates_sorted, "count": len(rates_sorted)}


@router.get("/history/{asset}")
async def funding_history(
    asset: str,
    start_time: Optional[int] = Query(None, description="Unix ms timestamp"),
):
    """Return funding rate history for a specific asset."""
    history = await get_funding_history(asset.upper(), start_time)
    # Normalize the response
    normalized = []
    for entry in history:
        normalized.append(
            {
                "asset": asset.upper(),
                "funding_rate": float(entry.get("fundingRate", 0) or 0),
                "premium": float(entry.get("premium", 0) or 0),
                "time": entry.get("time"),
            }
        )
    return {"asset": asset.upper(), "history": normalized}


@router.get("/extremes")
async def funding_extremes(top_n: int = Query(10, ge=1, le=50)):
    """Return assets with most extreme funding rates."""
    rates = await get_funding_rates()
    if not rates:
        return {"top_positive": [], "top_negative": []}

    sorted_positive = sorted(
        rates, key=lambda x: x.get("funding_rate", 0), reverse=True
    )
    sorted_negative = sorted(rates, key=lambda x: x.get("funding_rate", 0))

    return {
        "top_positive": sorted_positive[:top_n],
        "top_negative": sorted_negative[:top_n],
    }
