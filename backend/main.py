import os
import uuid
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import engine, SessionLocal
from models import Base, Pattern
from websocket_manager import manager, price_broadcast_loop
from routes import (
    journal, trades, stats, watchlist, patterns,
    pairs, funding, psychology, reviews, market,
    alerts, vaults, scanner,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

SEED_PATTERNS = [
    {
        "name": "VWAP Reclaim / Reject",
        "description": "Price reclaims or rejects the Volume Weighted Average Price. A reclaim is bullish continuation; a reject is bearish continuation or fade.",
        "entry_criteria": "Wait for price to test VWAP. On reclaim: first candle close above VWAP with momentum. On reject: first candle close below VWAP after failed reclaim attempt.",
        "exit_criteria": "Reclaim: target prior swing high or measured move. Reject: target prior swing low or VWAP - 1 ATR.",
        "invalidation": "Reclaim: close back below VWAP. Reject: close back above VWAP.",
        "timeframes": '["5m", "15m", "1h"]',
        "screenshots": "[]",
        "notes": "Most reliable during trending sessions. Avoid in choppy, low-volume conditions.",
    },
    {
        "name": "Liquidity Sweep + Reversal",
        "description": "Price sweeps a key high or low to grab stop orders, then reverses sharply in the opposite direction. Classic stop hunt pattern.",
        "entry_criteria": "Identify key high/low with obvious stop cluster. Wait for sweep (wick through level). Enter on the candle that closes back inside the range — confirmation of reversal.",
        "exit_criteria": "Target opposite liquidity pool or 50% of the sweep range as minimum. Scale out at equilibrium.",
        "invalidation": "Price continues through the swept level with momentum (no close back inside range).",
        "timeframes": '["15m", "1h", "4h"]',
        "screenshots": "[]",
        "notes": "Higher probability when sweep occurs at session open or major news event. Volume spike on sweep candle adds conviction.",
    },
    {
        "name": "Funding Rate Fade",
        "description": "When perpetual funding rates reach extreme positive or negative levels, the crowded trade gets squeezed. Fade the direction that is paying excessive funding.",
        "entry_criteria": "Funding rate > 0.05% (8h): consider shorts. Funding rate < -0.03% (8h): consider longs. Enter after price shows first sign of reversal — don't anticipate, wait for the turn.",
        "exit_criteria": "Target funding normalization zone. Exit when funding rate returns to neutral (0.01% range).",
        "invalidation": "Funding continues to escalate in same direction without price reversing within 2-3 periods.",
        "timeframes": '["1h", "4h"]',
        "screenshots": "[]",
        "notes": "Works best on major assets (BTC, ETH, SOL). Combine with OI divergence for higher conviction. Check Hyperliquid predicted next funding.",
    },
    {
        "name": "Range Breakout",
        "description": "Price consolidates in a well-defined range, then breaks out with conviction and expanding volume. Trade the breakout direction.",
        "entry_criteria": "Define range: at least 3 touches on each side. Wait for breakout candle to close fully outside the range. Enter on first pullback to the broken level (now support/resistance).",
        "exit_criteria": "Measured move target: range height projected from breakout point. Take partial profits at 1x range, full exit at 1.5-2x.",
        "invalidation": "Price closes back inside the range (failed breakout — consider fade in opposite direction).",
        "timeframes": '["1h", "4h", "1d"]',
        "screenshots": "[]",
        "notes": "Volume expansion on breakout candle is critical. Low-volume breakouts have high failure rate. Best on daily/weekly consolidations.",
    },
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all DB tables
    Base.metadata.create_all(bind=engine)

    # Seed patterns if empty
    db = SessionLocal()
    try:
        if db.query(Pattern).count() == 0:
            for p in SEED_PATTERNS:
                db.add(Pattern(id=str(uuid.uuid4()), **p))
            db.commit()
            logger.info("Seeded 4 initial patterns")
    finally:
        db.close()

    # Start APScheduler jobs
    from tasks.scheduler import start_scheduler
    start_scheduler()

    # Start price broadcast background task
    task = asyncio.create_task(price_broadcast_loop())
    logger.info("Price broadcast loop started")

    yield

    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

    from tasks.scheduler import stop_scheduler
    stop_scheduler()


app = FastAPI(
    title="Finance GenZ API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers
app.include_router(journal.router, prefix="/api/journal", tags=["journal"])
app.include_router(trades.router, prefix="/api/trades", tags=["trades"])
app.include_router(stats.router, prefix="/api/stats", tags=["stats"])
app.include_router(watchlist.router, prefix="/api/watchlist", tags=["watchlist"])
app.include_router(patterns.router, prefix="/api/patterns", tags=["patterns"])
app.include_router(pairs.router, prefix="/api/pairs", tags=["pairs"])
app.include_router(funding.router, prefix="/api/funding", tags=["funding"])
app.include_router(psychology.router, prefix="/api/psychology", tags=["psychology"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["reviews"])
app.include_router(market.router, prefix="/api/market", tags=["market"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(vaults.router, prefix="/api/vaults", tags=["vaults"])
app.include_router(scanner.router, prefix="/api/scanner", tags=["scanner"])


@app.websocket("/ws/prices")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive — prices are pushed from broadcast loop
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
