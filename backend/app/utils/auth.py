"""Authentication utilities - JWT token va password hashing."""

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import get_settings
from app.database import get_db
from app.models.user import User, UserRole

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    """Parolni hash qilish."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Parolni tekshirish."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """JWT token yaratish."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def get_current_user(
    token: Optional[str] = Depends(OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Joriy foydalanuvchini olish (JWT token orqali yoki mehmon sifatida)."""
    if not token:
        # Mehmon foydalanuvchini qaytarish
        result = await db.execute(select(User).where(User.username == "guest"))
        guest = result.scalar_one_or_none()
        if not guest:
            # Fayldan hash_password ni import qilish
            from app.utils.auth import hash_password
            guest = User(
                email="guest@ecowatch.uz",
                username="guest",
                full_name="Mehmon",
                hashed_password=hash_password("guest123"),
                role=UserRole.USER,
                is_active=True
            )
            db.add(guest)
            await db.commit()
            await db.refresh(guest)
        return guest

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Avtorizatsiya muvaffaqiyatsiz",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_sub = payload.get("sub")
        if user_id_sub is None:
            raise credentials_exception
        user_id = int(user_id_sub)
    except (JWTError, ValueError):
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        return await get_current_user(None, db) # Fallback to guest
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Foydalanuvchi bloklangan")
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Faol foydalanuvchini olish."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Foydalanuvchi faol emas")
    return current_user


async def get_moderator_user(current_user: User = Depends(get_current_user)) -> User:
    """Moderator foydalanuvchini olish."""
    if current_user.role not in [UserRole.MODERATOR, UserRole.ADMIN, UserRole.ORGANIZATION]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu amal uchun moderator huquqi kerak"
        )
    return current_user


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Admin foydalanuvchini olish."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu amal uchun admin huquqi kerak"
        )
    return current_user
