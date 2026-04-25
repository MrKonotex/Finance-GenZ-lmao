import os
import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

HL_API_URL = "https://api.hyperliquid.xyz/info"
HL_WALLET_ADDRESS = os.getenv("HL_WALLET_ADDRESS", "")

TIMEOUT = 10.0


async def _post(payload: dict) -> dict | list | None:
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.post(HL_API_URL, json=payload)
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        logger.warning(f"Hyperliquid API error: {e}")
        return None


async def get_all_mids() -> dict:
    """Return dict of asset → mid price for all perps."""
    data = await _post({"type": "allMids"})
    if isinstance(data, dict):
        return data
    return {}


async def get_meta() -> dict:
    """Return perpetual metadata (universe, etc.)."""
    data = await _post({"type": "meta"})
    if isinstance(data, dict):
        return data
    return {}


async def get_funding_rates() -> list:
    """Return list of {coin, fundingRate, openInterest, ...} for all perps."""
    data = await _post({"type": "metaAndAssetCtxs"})
    if not isinstance(data, list) or len(data) < 2:
        return []
    meta = data[0]
    asset_ctxs = data[1]
    universe = meta.get("universe", [])
    result = []
    for i, asset_info in enumerate(universe):
        ctx = asset_ctxs[i] if i < len(asset_ctxs) else {}
        result.append(
            {
                "asset": asset_info.get("name", f"ASSET_{i}"),
                "funding_rate": float(ctx.get("funding", 0) or 0),
                "open_interest": float(ctx.get("openInterest", 0) or 0),
                "mark_price": float(ctx.get("markPx", 0) or 0),
            }
        )
    return result


async def get_user_state(address: Optional[str] = None) -> dict:
    """Return account state for a given wallet address."""
    addr = address or HL_WALLET_ADDRESS
    if not addr:
        return {}
    data = await _post({"type": "clearinghouseState", "user": addr})
    if isinstance(data, dict):
        return data
    return {}


async def get_vault_positions(address: Optional[str] = None) -> list:
    """Return vault positions for a given wallet address."""
    addr = address or HL_WALLET_ADDRESS
    if not addr:
        return []
    data = await _post({"type": "vaultDetails", "user": addr, "vaultAddress": addr})
    if isinstance(data, dict):
        return data.get("positions", [])
    return []


async def get_funding_history(asset: str, start_time: Optional[int] = None) -> list:
    """Return funding rate history for a specific asset."""
    payload: dict = {"type": "fundingHistory", "coin": asset, "startTime": start_time or 0}
    data = await _post(payload)
    if isinstance(data, list):
        return data
    return []
