
import asyncio
from app.database import init_db, async_session
from app.models.user import User, UserRole
from app.models.report import Report, ReportImage, Comment, Reward # Import all models to resolve refs
from app.utils.auth import hash_password
from sqlalchemy import select

async def check_and_fix_admin():
    await init_db()
    async with async_session() as db:
        result = await db.execute(select(User).where(User.username == "adminos"))
        admin = result.scalar_one_or_none()
        
        if admin:
            print(f"Admin found: {admin.username}, updating password...")
            admin.hashed_password = hash_password("P1l2a3y4%")
            admin.role = UserRole.ADMIN
            admin.is_active = True
            admin.is_verified = True
        else:
            print("Admin not found, creating new admin...")
            admin = User(
                email="adminos@ecowatch.uz",
                username="adminos",
                full_name="Admin OS",
                hashed_password=hash_password("P1l2a3y4%"),
                role=UserRole.ADMIN,
                is_active=True,
                is_verified=True
            )
            db.add(admin)
        
        await db.commit()
        print("Done!")

if __name__ == "__main__":
    asyncio.run(check_and_fix_admin())
