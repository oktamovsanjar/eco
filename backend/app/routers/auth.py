"""Auth router - Ro'yxatdan o'tish va kirish."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import (
    UserRegister, UserLogin, Token, UserResponse,
    UserUpdate, UserRoleUpdate, LeaderboardEntry
)
from app.utils.auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, get_admin_user
)

router = APIRouter(prefix="/api/auth", tags=["Autentifikatsiya"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: AsyncSession = Depends(get_db)):
    """Yangi foydalanuvchi ro'yxatdan o'tishi."""
    # Email yoki username mavjudligini tekshirish
    existing = await db.execute(
        select(User).where(
            or_(User.email == user_data.email, User.username == user_data.username)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu email yoki username allaqachon ro'yxatdan o'tgan"
        )

    # Yangi foydalanuvchi yaratish
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=hash_password(user_data.password),
        phone=user_data.phone,
        role=UserRole.USER
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Token yaratish
    access_token = create_access_token(data={"sub": str(new_user.id)})

    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(new_user)
    )


@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Foydalanuvchi kirishi."""
    # Email yoki username bo'yicha qidirish
    result = await db.execute(
        select(User).where(
            or_(User.email == login_data.email, User.username == login_data.email)
        )
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email/username yoki parol noto'g'ri"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hisobingiz bloklangan"
        )

    # Last login yangilash
    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    # Token yaratish
    access_token = create_access_token(data={"sub": str(user.id)})

    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    """Joriy foydalanuvchi profilini olish."""
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
async def update_profile(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Profilni yangilash."""
    if user_data.full_name is not None:
        current_user.full_name = user_data.full_name
    if user_data.phone is not None:
        current_user.phone = user_data.phone
    if user_data.avatar_url is not None:
        current_user.avatar_url = user_data.avatar_url

    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 50,
    role: UserRole | None = None,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Barcha foydalanuvchilar ro'yxati (faqat admin)."""
    query = select(User)
    if role:
        query = query.where(User.role == role)
    query = query.offset(skip).limit(limit).order_by(User.created_at.desc())

    result = await db.execute(query)
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


@router.put("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    role_data: UserRoleUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Foydalanuvchi rolini o'zgartirish (faqat admin)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")

    user.role = role_data.role
    if role_data.organization_name:
        user.organization_name = role_data.organization_name
    if role_data.organization_type:
        user.organization_type = role_data.organization_type

    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.post("/create-moderator", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_moderator(
    user_data: UserRegister,
    role: UserRole = UserRole.MODERATOR,
    organization_name: str = "",
    organization_type: str = "",
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin: Yangi moderator/tashkilot yaratish."""
    # Email yoki username mavjudligini tekshirish
    existing = await db.execute(
        select(User).where(
            or_(User.email == user_data.email, User.username == user_data.username)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu email yoki username allaqachon ro'yxatdan o'tgan"
        )

    new_user = User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=hash_password(user_data.password),
        phone=user_data.phone,
        role=role,
        organization_name=organization_name or None,
        organization_type=organization_type or None,
        is_active=True,
        is_verified=True
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return UserResponse.model_validate(new_user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin: Foydalanuvchini o'chirish."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Admin foydalanuvchini o'chirib bo'lmaydi")
    await db.delete(user)
    await db.commit()


@router.put("/users/{user_id}/toggle-active", response_model=UserResponse)
async def toggle_user_active(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin: Foydalanuvchini bloklash/faollashtirish."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    user.is_active = not user.is_active
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def get_leaderboard(
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """Top foydalanuvchilar reytingi (ochiq API)."""
    result = await db.execute(
        select(User)
        .where(User.is_active == True)
        .order_by(User.points.desc())
        .limit(limit)
    )
    users = result.scalars().all()
    return [LeaderboardEntry.model_validate(u) for u in users]
