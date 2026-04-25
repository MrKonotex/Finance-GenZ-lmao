import logging
from typing import Optional

logger = logging.getLogger(__name__)


async def get_stock_price(ticker: str) -> Optional[float]:
    """Return latest closing price for a stock ticker."""
    try:
        import yfinance as yf

        t = yf.Ticker(ticker.upper())
        hist = t.history(period="2d")
        if hist.empty:
            return None
        return float(hist["Close"].iloc[-1])
    except Exception as e:
        logger.warning(f"yfinance get_stock_price({ticker}) error: {e}")
        return None


async def get_stock_history(ticker: str, period: str = "1mo") -> list:
    """Return OHLCV history for a stock ticker as list of dicts."""
    try:
        import yfinance as yf

        t = yf.Ticker(ticker.upper())
        hist = t.history(period=period)
        if hist.empty:
            return []
        result = []
        for idx, row in hist.iterrows():
            result.append(
                {
                    "date": idx.strftime("%Y-%m-%d"),
                    "open": float(row["Open"]),
                    "high": float(row["High"]),
                    "low": float(row["Low"]),
                    "close": float(row["Close"]),
                    "volume": float(row["Volume"]),
                }
            )
        return result
    except Exception as e:
        logger.warning(f"yfinance get_stock_history({ticker}) error: {e}")
        return []
