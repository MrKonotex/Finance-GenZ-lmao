import httpx
import logging

logger = logging.getLogger(__name__)

ALTERNATIVE_ME_URL = "https://api.alternative.me/fng/"
TIMEOUT = 10.0


async def get_fear_greed(limit: int = 1) -> dict:
    """
    Return current crypto Fear & Greed index from alternative.me.
    Returns dict with value, classification, timestamp.
    """
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(ALTERNATIVE_ME_URL, params={"limit": limit, "format": "json"})
            resp.raise_for_status()
            data = resp.json()
            entries = data.get("data", [])
            if not entries:
                return {}
            latest = entries[0]
            result = {
                "value": int(latest.get("value", 0)),
                "classification": latest.get("value_classification", ""),
                "timestamp": latest.get("timestamp"),
                "time_until_update": latest.get("time_until_update"),
            }
            if limit > 1:
                result["history"] = [
                    {
                        "value": int(e.get("value", 0)),
                        "classification": e.get("value_classification", ""),
                        "timestamp": e.get("timestamp"),
                    }
                    for e in entries
                ]
            return result
    except Exception as e:
        logger.warning(f"alternative.me get_fear_greed error: {e}")
        return {}


async def get_fear_greed_history(limit: int = 30) -> list:
    """Return Fear & Greed history as list of dicts."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(ALTERNATIVE_ME_URL, params={"limit": limit, "format": "json"})
            resp.raise_for_status()
            data = resp.json()
            entries = data.get("data", [])
            return [
                {
                    "value": int(e.get("value", 0)),
                    "classification": e.get("value_classification", ""),
                    "timestamp": e.get("timestamp"),
                }
                for e in entries
            ]
    except Exception as e:
        logger.warning(f"alternative.me get_fear_greed_history error: {e}")
        return []
