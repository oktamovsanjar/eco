
import asyncio
from app.database import async_session
from app.models.report import Report
from sqlalchemy import select

async def check():
    async with async_session() as db:
        res = await db.execute(select(Report))
        rs = res.scalars().all()
        print(f"Reports count: {len(rs)}")
        for r in rs:
            print(f"ID: {r.id}, Lat: {r.latitude}, Lng: {r.longitude}, Status: {r.status}, Title: {r.title}")

if __name__ == "__main__":
    asyncio.run(check())
