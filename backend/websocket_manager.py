import asyncio
import json
import logging
from typing import List
from fastapi import WebSocket
from services.hyperliquid import get_all_mids

logger = logging.getLogger(__name__)

PRICE_ASSETS = [
    "BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX", "LINK", "DOT",
]


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WS client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WS client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, data: dict):
        if not self.active_connections:
            return
        message = json.dumps(data)
        dead: List[WebSocket] = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                dead.append(connection)
        for conn in dead:
            self.disconnect(conn)

    async def send_personal(self, websocket: WebSocket, data: dict):
        try:
            await websocket.send_text(json.dumps(data))
        except Exception as e:
            logger.warning(f"Failed to send personal WS message: {e}")
            self.disconnect(websocket)


manager = ConnectionManager()


async def price_broadcast_loop():
    """Background task: fetch prices every 5 seconds and broadcast to all WS clients."""
    while True:
        try:
            mids = await get_all_mids()
            if mids:
                await manager.broadcast({"type": "prices", "data": mids})
        except Exception as e:
            logger.warning(f"price_broadcast_loop error: {e}")
        await asyncio.sleep(5)
