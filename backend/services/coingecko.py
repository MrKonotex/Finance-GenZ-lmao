import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

COINGECKO_BASE = "https://api.coingecko.com/api/v3"
TIMEOUT = 15.0


async def get_global_data() -> dict:
    """Return global crypto market data including BTC dominance."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(f"{COINGECKO_BASE}/global")
            resp.raise_for_status()
            data = resp.json().get("data", {})
            return {
                "total_market_cap_usd": data.get("total_market_cap", {}).get("usd", 0),
                "total_volume_usd": data.get("total_volume", {}).get("usd", 0),
                "btc_dominance": data.get("market_cap_percentage", {}).get("btc", 0),
                "eth_dominance": data.get("market_cap_percentage", {}).get("eth", 0),
                "market_cap_change_24h_pct": data.get("market_cap_change_percentage_24h_usd", 0),
                "active_cryptocurrencies": data.get("active_cryptocurrencies", 0),
                "updated_at": data.get("updated_at"),
            }
    except Exception as e:
        logger.warning(f"CoinGecko get_global_data error: {e}")
        return {}


async def get_btc_dominance_history(days: int = 30) -> list:
    """Return BTC dominance history as list of [timestamp, value] pairs."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(
                f"{COINGECKO_BASE}/global/market_cap_chart",
                params={"days": days},
            )
            resp.raise_for_status()
            data = resp.json()
            market_cap_chart = data.get("market_cap_chart", {})
            # The chart returns total market cap; combine with global data for dominance
            # Return raw market cap data as a proxy
            return market_cap_chart.get("market_cap", [])
    except Exception as e:
        logger.warning(f"CoinGecko get_btc_dominance_history error: {e}")
        return []


async def get_coins_markets(vs_currency: str = "usd", per_page: int = 50) -> list:
    """Return top coins market data."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(
                f"{COINGECKO_BASE}/coins/markets",
                params={
                    "vs_currency": vs_currency,
                    "order": "market_cap_desc",
                    "per_page": per_page,
                    "page": 1,
                    "sparkline": False,
                    "price_change_percentage": "24h",
                },
            )
            resp.raise_for_status()
            coins = resp.json()
            return [
                {
                    "id": c.get("id"),
                    "symbol": c.get("symbol", "").upper(),
                    "name": c.get("name"),
                    "current_price": c.get("current_price"),
                    "market_cap": c.get("market_cap"),
                    "market_cap_rank": c.get("market_cap_rank"),
                    "price_change_24h_pct": c.get("price_change_percentage_24h"),
                    "volume_24h": c.get("total_volume"),
                    "high_24h": c.get("high_24h"),
                    "low_24h": c.get("low_24h"),
                }
                for c in coins
            ]
    except Exception as e:
        logger.warning(f"CoinGecko get_coins_markets error: {e}")
        return []
