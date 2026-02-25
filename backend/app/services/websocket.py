"""WebSocket manager - Real-time yangilanishlar."""

from fastapi import WebSocket
from typing import Dict, Set
import json


class ConnectionManager:
    """WebSocket ulanishlarini boshqarish."""

    def __init__(self):
        # Barcha ulanishlar
        self.active_connections: list[WebSocket] = []
        # Hudud bo'yicha ulanishlar
        self.region_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, region: str = "all"):
        """Yangi ulanishni qo'shish."""
        await websocket.accept()
        self.active_connections.append(websocket)

        if region not in self.region_connections:
            self.region_connections[region] = set()
        self.region_connections[region].add(websocket)

    def disconnect(self, websocket: WebSocket):
        """Ulanishni o'chirish."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

        for region in self.region_connections:
            self.region_connections[region].discard(websocket)

    async def broadcast(self, message: dict):
        """Barcha ulanishlarga xabar yuborish."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)

        for conn in disconnected:
            self.disconnect(conn)

    async def broadcast_to_region(self, region: str, message: dict):
        """Ma'lum hudud ulanishlariga xabar yuborish."""
        connections = self.region_connections.get(region, set())
        disconnected = []
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)

        for conn in disconnected:
            self.disconnect(conn)

    async def send_new_report(self, report_data: dict):
        """Yangi hisobot haqida xabar yuborish."""
        message = {
            "type": "new_report",
            "data": report_data
        }
        await self.broadcast(message)

    async def send_status_update(self, report_id: int, new_status: str):
        """Status yangilanishi haqida xabar."""
        message = {
            "type": "status_update",
            "data": {
                "report_id": report_id,
                "status": new_status
            }
        }
        await self.broadcast(message)


# Global instance
manager = ConnectionManager()
