from fastapi import APIRouter
from services.coingecko import get_global_data, get_coins_markets, get_btc_dominance_history
from services.alternative_me import get_fear_greed, get_fear_greed_history

router = APIRouter()


@router.get("/overview")
async def market_overview():
    """
    Combined market overview: BTC dominance, fear & greed, top movers.
    """
    import asyncio

    global_data, fear_greed, coins = await asyncio.gather(
        get_global_data(),
        get_fear_greed(limit=1),
        get_coins_markets(per_page=20),
        return_exceptions=True,
    )

    if isinstance(global_data, Exception):
        global_data = {}
    if isinstance(fear_greed, Exception):
        fear_greed = {}
    if isinstance(coins, Exception):
        coins = []

    # Top movers by 24h % change
    top_gainers = sorted(
        [c for c in coins if c.get("price_change_24h_pct") is not None],
        key=lambda x: x["price_change_24h_pct"],
        reverse=True,
    )[:5]

    top_losers = sorted(
        [c for c in coins if c.get("price_change_24h_pct") is not None],
        key=lambda x: x["price_change_24h_pct"],
    )[:5]

    return {
        "btc_dominance": global_data.get("btc_dominance"),
        "eth_dominance": global_data.get("eth_dominance"),
        "total_market_cap_usd": global_data.get("total_market_cap_usd"),
        "market_cap_change_24h_pct": global_data.get("market_cap_change_24h_pct"),
        "fear_greed": fear_greed,
        "top_gainers": top_gainers,
        "top_losers": top_losers,
    }


@router.get("/dominance")
async def btc_dominance(days: int = 30):
    """BTC dominance data from CoinGecko (market cap history)."""
    global_data = await get_global_data()
    history = await get_btc_dominance_history(days=days)

    return {
        "current_btc_dominance": global_data.get("btc_dominance"),
        "current_eth_dominance": global_data.get("eth_dominance"),
        "market_cap_history": history,  # list of [timestamp_ms, value]
        "note": "History shows total market cap; use current dominance for snapshot",
    }


@router.get("/fear_greed")
async def fear_greed_index(history: int = 1):
    """
    Crypto Fear & Greed index from alternative.me.
    Pass history=N to get last N days.
    """
    if history <= 1:
        data = await get_fear_greed(limit=1)
        return data
    else:
        hist = await get_fear_greed_history(limit=history)
        current = hist[0] if hist else {}
        return {
            "current": current,
            "history": hist,
        }


@router.get("/macro_calendar")
async def macro_calendar():
    """
    Upcoming macro economic events.
    Static structure for now — replace with a real calendar feed when available.
    """
    from datetime import date, timedelta

    today = date.today()

    # Hardcoded upcoming events — structure ready for dynamic replacement
    events = [
        {
            "date": (today + timedelta(days=2)).isoformat(),
            "time_utc": "18:00",
            "event": "FOMC Meeting Minutes",
            "country": "US",
            "importance": "high",
            "forecast": None,
            "previous": None,
        },
        {
            "date": (today + timedelta(days=5)).isoformat(),
            "time_utc": "13:30",
            "event": "US CPI (MoM)",
            "country": "US",
            "importance": "high",
            "forecast": "0.3%",
            "previous": "0.4%",
        },
        {
            "date": (today + timedelta(days=7)).isoformat(),
            "time_utc": "13:30",
            "event": "US Initial Jobless Claims",
            "country": "US",
            "importance": "medium",
            "forecast": "215K",
            "previous": "220K",
        },
        {
            "date": (today + timedelta(days=12)).isoformat(),
            "time_utc": "13:30",
            "event": "US PPI (MoM)",
            "country": "US",
            "importance": "medium",
            "forecast": None,
            "previous": "0.2%",
        },
        {
            "date": (today + timedelta(days=14)).isoformat(),
            "time_utc": "14:00",
            "event": "US Retail Sales",
            "country": "US",
            "importance": "high",
            "forecast": None,
            "previous": "0.7%",
        },
    ]

    return {
        "events": events,
        "note": "Static calendar — integrate with a real economic calendar API for live data",
    }
