import asyncio
import json
import logging
from typing import Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request
import redis.asyncio as redis
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSockets"])

class ConnectionManager:
    def __init__(self):
        # tenant_id -> list of active connections
        self.active_connections: Dict[str, list[WebSocket]] = {}
        self.redis_client = None
        self.pubsub = None
        
    async def connect(self, websocket: WebSocket, tenant_id: str):
        await websocket.accept()
        if tenant_id not in self.active_connections:
            self.active_connections[tenant_id] = []
        self.active_connections[tenant_id].append(websocket)
        logger.info(f"WebSocket connected for tenant {tenant_id}")
        
    def disconnect(self, websocket: WebSocket, tenant_id: str):
        if tenant_id in self.active_connections:
            if websocket in self.active_connections[tenant_id]:
                self.active_connections[tenant_id].remove(websocket)
                logger.info(f"WebSocket disconnected for tenant {tenant_id}")

    async def broadcast_to_tenant(self, tenant_id: str, message: Dict[str, Any]):
        if tenant_id in self.active_connections:
            for connection in self.active_connections[tenant_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message to websocket: {e}")
                    
    async def setup_redis(self):
        """Sets up the Redis PubSub listener for cross-worker broadcasting"""
        try:
            self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            self.pubsub = self.redis_client.pubsub()
            await self.pubsub.subscribe("fraud_alerts")
            
            asyncio.create_task(self._listen_to_redis())
            logger.info("Connected to Redis PubSub for fraud_alerts")
        except Exception as e:
            logger.info("Redis not detected. Operating in local WebSocket broadcast mode.")

    async def _listen_to_redis(self):
        """Background task that listens to Redis and broadcasts to local websockets"""
        if not self.pubsub:
            return
            
        try:
            async for message in self.pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    tenant_id = data.get("tenant_id", "default")
                    await self.broadcast_to_tenant(tenant_id, data)
        except Exception as e:
            logger.error(f"Redis listener error: {e}")

    async def publish_alert(self, tenant_id: str, data: dict):
        """Publishes an alert. Tries Redis first, falls back to local broadcast."""
        try:
            if self.redis_client:
                await self.redis_client.publish("fraud_alerts", json.dumps(data))
            else:
                await self.broadcast_to_tenant(tenant_id, data)
        except Exception as e:
            # Fallback quietly
            await self.broadcast_to_tenant(tenant_id, data)

manager = ConnectionManager()

@router.on_event("startup")
async def startup_event():
    await manager.setup_redis()

@router.websocket("/ws/alerts/{tenant_id}")
async def websocket_endpoint(websocket: WebSocket, tenant_id: str):
    await manager.connect(websocket, tenant_id)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, tenant_id)
@router.post("/ws/internal/broadcast")
async def internal_broadcast(request: Request):
    """Internal endpoint for sync workers to trigger websocket broadcasts"""
    data = await request.json()
    tenant_id = data.get("tenant_id", "default")
    await manager.publish_alert(tenant_id, data)
    return {"status": "ok"}
