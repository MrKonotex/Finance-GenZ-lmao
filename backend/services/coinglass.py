"""
Coinglass service — stub implementation.
TODO: Coinglass requires a paid API key (https://coinglass.com/pricing).
      Replace the mock data below with real API calls once you have a key.
      Set the env var COINGLASS_API_KEY and uncomment the real implementation.
"""
import logging
import os

logger = logging.getLogger(__name__)

COINGLASS_API_KEY = os.getenv("COINGLASS_API_KEY", "")
COINGLASS_BASE = "https://open-api.coinglass.com/public/v2"


async def get_liquidation_heatmap(symbol: str = "BTC") -> dict:
    """
    Return liquidation heatmap data for a symbol.
    TODO: Implement real call when COINGLASS_API_KEY is available.
    Real endpoint: GET /indicator/liquidation_heatmap?symbol={symbol}&timeType=0
    """
    return {
        "symbol": symbol,
        "data": [],
        "note": "Coinglass paid API required — configure COINGLASS_API_KEY to enable",
    }


async def get_open_interest(symbol: str = "BTC") -> dict:
    """
    Return open interest data for a symbol.
    TODO: Implement real call when COINGLASS_API_KEY is available.
    Real endpoint: GET /indicator/open_interest?symbol={symbol}&interval=0
    """
    return {
        "symbol": symbol,
        "exchanges": [],
        "total_open_interest_usd": None,
        "note": "Coinglass paid API required — configure COINGLASS_API_KEY to enable",
    }


async def get_long_short_ratio(symbol: str = "BTC") -> dict:
    """
    Return long/short ratio for a symbol.
    TODO: Implement real call when COINGLASS_API_KEY is available.
    Real endpoint: GET /indicator/long_short_ratio?symbol={symbol}&interval=0
    """
    return {
        "symbol": symbol,
        "long_ratio": None,
        "short_ratio": None,
        "history": [],
        "note": "Coinglass paid API required — configure COINGLASS_API_KEY to enable",
    }
