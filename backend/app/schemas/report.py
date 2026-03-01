"""Report schemas - Shikoyat uchun request/response schemas."""

from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional
from app.models.report import ReportCategory, ReportStatus, ReportPriority


# ========== Report Create/Update ==========

class ReportCreate(BaseModel):
    title: str
    description: str
    category: ReportCategory
    latitude: float
    longitude: float
    address: Optional[str] = None
    region: Optional[str] = None
    district: Optional[str] = None
    priority: Optional[ReportPriority] = ReportPriority.MEDIUM

    @field_validator("title")
    @classmethod
    def validate_title(cls, v):
        if len(v) < 5:
            raise ValueError("Sarlavha kamida 5 ta belgidan iborat bo'lishi kerak")
        if len(v) > 300:
            raise ValueError("Sarlavha 300 ta belgidan oshmasligi kerak")
        return v

    @field_validator("description")
    @classmethod
    def validate_description(cls, v):
        if len(v) < 10:
            raise ValueError("Tavsif kamida 10 ta belgidan iborat bo'lishi kerak")
        return v

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v):
        if not (-90 <= v <= 90):
            raise ValueError("Kenglik -90 dan 90 gacha bo'lishi kerak")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v):
        if not (-180 <= v <= 180):
            raise ValueError("Uzunlik -180 dan 180 gacha bo'lishi kerak")
        return v


class ReportUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[ReportCategory] = None
    priority: Optional[ReportPriority] = None


# ========== Moderator Actions ==========

class ReportVerify(BaseModel):
    """Moderator tasdiqlash/rad etish."""
    status: ReportStatus
    moderator_comment: Optional[str] = None
    points_to_award: Optional[int] = 0  # Ball berish


class ReportResolve(BaseModel):
    """Muammoni hal qilish."""
    resolution_description: str
    points_to_award: Optional[int] = 10


# ========== Response Schemas ==========

class ReportImageResponse(BaseModel):
    id: int
    image_url: str
    thumbnail_url: Optional[str] = None
    original_filename: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def validate_content(cls, v):
        if len(v) < 2:
            raise ValueError("Izoh kamida 2 ta belgidan iborat bo'lishi kerak")
        return v


class CommentResponse(BaseModel):
    id: int
    report_id: int
    author_id: int
    author_name: Optional[str] = None
    author_role: Optional[str] = None
    content: str
    is_official: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReportResponse(BaseModel):
    id: int
    title: str
    description: str
    category: ReportCategory
    priority: ReportPriority
    latitude: float
    longitude: float
    address: Optional[str] = None
    region: Optional[str] = None
    district: Optional[str] = None
    status: ReportStatus
    author_id: int
    author_name: Optional[str] = None
    moderator_id: Optional[int] = None
    moderator_comment: Optional[str] = None
    verified_at: Optional[datetime] = None
    resolution_description: Optional[str] = None
    resolved_at: Optional[datetime] = None
    points_awarded: int
    upvotes: int
    views_count: int
    images: list[ReportImageResponse] = []
    comments: list[CommentResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReportListResponse(BaseModel):
    """Hisobotlar ro'yxati uchun qisqartirilgan schema."""
    id: int
    title: str
    category: ReportCategory
    priority: ReportPriority
    latitude: float
    longitude: float
    address: Optional[str] = None
    region: Optional[str] = None
    district: Optional[str] = None
    status: ReportStatus
    author_name: Optional[str] = None
    upvotes: int
    views_count: int
    images_count: int = 0
    comments_count: int = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MapMarker(BaseModel):
    """Xaritadagi marker uchun schema."""
    id: int
    title: str
    category: ReportCategory
    priority: ReportPriority
    latitude: float
    longitude: float
    status: ReportStatus
    upvotes: int
    created_at: Optional[datetime] = None


class ReportStats(BaseModel):
    """Statistika."""
    total_reports: int
    pending: int
    under_review: int
    verified: int
    resolved: int
    rejected: int
    by_category: dict[str, int]
    by_priority: dict[str, int]
