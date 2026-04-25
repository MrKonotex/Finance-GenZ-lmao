import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

BINANCE_BASE = "https://api.binance.com/api/v3"
TIMEOUT = 10.0


async def get_price(symbol: str) -> Optional[float]:
    """Return latest price for a Binance symbol (e.g. BTCUSDT)."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(f"{BINANCE_BASE}/ticker/price", params={"symbol": symbol.upper()})
            resp.raise_for_status()
            return float(resp.json()["price"])
    except Exception as e:
        logger.warning(f"Binance get_price({symbol}) error: {e}")
        return None


async def get_klines(symbol: str, interval: str = "1d", limit: int = 100) -> list:
    """Return list of OHLCV dicts for a symbol."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(
                f"{BINANCE_BASE}/klines",
                params={"symbol": symbol.upper(), "interval": interval, "limit": limit},
            )
            resp.raise_for_status()
            raw = resp.json()
            result = []
            for k in raw:
                result.append(
                    {
                        "open_time": k[0],
                        "open": float(k[1]),
                        "high": float(k[2]),
                        "low": float(k[3]),
                        "close": float(k[4]),
                        "volume": float(k[5]),
                        "close_time": k[6],
                    }
                )
            return result
    except Exception as e:
        logger.warning(f"Binance get_klines({symbol}) error: {e}")
        return []


async def get_24h_stats(symbol: str) -> dict:
    """Return 24h ticker stats for a symbol."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(
                f"{BINANCE_BASE}/ticker/24hr", params={"symbol": symbol.upper()}
            )
            resp.raise_for_status()
            d = resp.json()
            return {
                "symbol": d.get("symbol"),
                "price_change": float(d.get("priceChange", 0)),
                "price_change_pct": float(d.get("priceChangePercent", 0)),
                "last_price": float(d.get("lastPrice", 0)),
                "volume": float(d.get("volume", 0)),
                "quote_volume": float(d.get("quoteVolume", 0)),
                "high": float(d.get("highPrice", 0)),
                "low": float(d.get("lowPrice", 0)),
            }
    except Exception as e:
        logger.warning(f"Binance get_24h_stats({symbol}) error: {e}")
        return {}
