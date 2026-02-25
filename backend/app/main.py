"""EcoWatch API - Ekologiya va Yo'l Qurilish Monitoring Platformasi.

Asosiy xususiyatlar:
- GPS orqali real-time xarita
- Shikoyat tizimi (rasm + joylashuv)
- Moderator paneli
- Rag'batlantirish tizimi
- WebSocket orqali real-time yangilanishlar
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import get_settings
from app.database import init_db
from app.routers import auth, reports
from app.services.websocket import manager

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup va shutdown hodisalari."""
    # Startup
    print("🌍 EcoWatch API ishga tushmoqda...")
    await init_db()
    print("✅ Ma'lumotlar bazasi tayyor")

    # Upload papkasini yaratish
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "thumbnails"), exist_ok=True)
    print("📁 Upload papkasi tayyor")

    # Boshlang'ich admin foydalanuvchi yaratish
    from app.database import async_session
    from app.models.user import User, UserRole
    from app.utils.auth import hash_password
    from sqlalchemy import select

    async with async_session() as db:
        result = await db.execute(select(User).where(User.role == UserRole.ADMIN))
        admin = result.scalar_one_or_none()
        if not admin:
            admin_user = User(
                email="adminos@ecowatch.uz",
                username="adminos",
                full_name="Admin OS",
                hashed_password=hash_password("P1l2a3y4%"),
                role=UserRole.ADMIN,
                is_active=True,
                is_verified=True
            )
            db.add(admin_user)

            # Test moderator
            moderator = User(
                email="moderator@ecowatch.uz",
                username="moderator",
                full_name="Ekologiya Bo'limi",
                hashed_password=hash_password("mod123"),
                role=UserRole.MODERATOR,
                organization_name="Ekologiya Qo'mitasi",
                organization_type="ekologiya",
                is_active=True,
                is_verified=True
            )
            db.add(moderator)

            # Test road moderator
            road_mod = User(
                email="road@ecowatch.uz",
                username="road_moderator",
                full_name="Yo'l Qurilish Bo'limi",
                hashed_password=hash_password("road123"),
                role=UserRole.MODERATOR,
                organization_name="Yo'l Qurilish Boshqarmasi",
                organization_type="yol_qurilish",
                is_active=True,
                is_verified=True
            )
            db.add(road_mod)
            
            # Guest user for anonymous reports
            guest = User(
                email="guest@ecowatch.uz",
                username="guest",
                full_name="Mehmon",
                hashed_password=hash_password("guest123"),
                role=UserRole.USER,
                is_active=True,
                is_verified=False
            )
            db.add(guest)
            
            await db.commit()
            print("👤 Boshlang'ich admin va moderator foydalanuvchilar yaratildi")
            print("   Admin: admin@ecowatch.uz / admin123")
            print("   Moderator (Ekologiya): moderator@ecowatch.uz / mod123")
            print("   Moderator (Yo'l): road@ecowatch.uz / road123")
            print("   Guest: guest (for anonymous reports)")

    print("🚀 EcoWatch API tayyor!")
    yield
    # Shutdown
    print("🛑 EcoWatch API to'xtatilmoqda...")


app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files (uploads)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Routers
app.include_router(auth.router)
app.include_router(reports.router)


# ========== WebSocket ==========

@app.websocket("/ws/{region}")
async def websocket_endpoint(websocket: WebSocket, region: str = "all"):
    """Real-time yangilanishlar uchun WebSocket."""
    await manager.connect(websocket, region)
    try:
        while True:
            data = await websocket.receive_text()
            # Client dan kelgan xabarlarni qayta ishlash
            # (masalan, ping/pong)
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ========== Health Check ==========

@app.get("/", tags=["Umumiy"])
async def root():
    """API sog'ligi tekshiruvi."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "ishlamoqda ✅",
        "docs": "/docs",
        "description": settings.APP_DESCRIPTION
    }


@app.get("/api/health", tags=["Umumiy"])
async def health_check():
    """API sog'ligi tekshiruvi."""
    return {"status": "healthy", "service": "ecowatch-api"}
