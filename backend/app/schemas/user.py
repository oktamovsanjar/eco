"""User schemas - Foydalanuvchi uchun request/response schemas."""

from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional
from app.models.user import UserRole


# ========== Auth Schemas ==========

class UserRegister(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    password: str
    phone: Optional[str] = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError("Username kamida 3 ta belgidan iborat bo'lishi kerak")
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username faqat harf, raqam, _ va - dan iborat bo'lishi kerak")
        return v.lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError("Parol kamida 6 ta belgidan iborat bo'lishi kerak")
        return v


class UserLogin(BaseModel):
    email: str  # Can be email or username
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class TokenData(BaseModel):
    user_id: Optional[int] = None


# ========== User Response Schemas ==========

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    is_active: bool
    is_verified: bool
    organization_name: Optional[str] = None
    organization_type: Optional[str] = None
    points: int
    reports_count: int
    verified_reports_count: int
    rank: str
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class UserRoleUpdate(BaseModel):
    role: UserRole
    organization_name: Optional[str] = None
    organization_type: Optional[str] = None


class LeaderboardEntry(BaseModel):
    id: int
    username: str
    full_name: str
    points: int
    verified_reports_count: int
    rank: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


# Forward reference update
Token.model_rebuild()
