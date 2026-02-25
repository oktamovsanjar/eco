"""Report model - Shikoyatlar/Hisobotlar jadvali."""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class ReportCategory(str, enum.Enum):
    ECOLOGY = "ekologiya"
    ROAD = "yol_qurilish"
    WATER = "suv_muammosi"
    AIR = "havo_ifloslanishi"
    WASTE = "chiqindi"
    NOISE = "shovqin"
    DEFORESTATION = "daraxt_kesish"
    CONSTRUCTION = "qurilish_buzilishi"
    OTHER = "boshqa"


class ReportStatus(str, enum.Enum):
    PENDING = "kutilmoqda"
    UNDER_REVIEW = "tekshirilmoqda"
    VERIFIED = "tasdiqlangan"
    REJECTED = "rad_etilgan"
    IN_PROGRESS = "hal_qilinmoqda"
    RESOLVED = "hal_qilindi"
    CLOSED = "yopilgan"


class ReportPriority(str, enum.Enum):
    LOW = "past"
    MEDIUM = "o'rta"
    HIGH = "yuqori"
    CRITICAL = "juda_muhim"


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Content
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(SQLEnum(ReportCategory), nullable=False)
    priority = Column(SQLEnum(ReportPriority), default=ReportPriority.MEDIUM)

    # Location (GPS)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    address = Column(String(500), nullable=True)
    region = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)

    # Status
    status = Column(SQLEnum(ReportStatus), default=ReportStatus.PENDING, index=True)

    # Author
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Moderator
    moderator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    moderator_comment = Column(Text, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    # Resolution
    resolution_description = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Points awarded to reporter
    points_awarded = Column(Integer, default=0)

    # Engagement
    upvotes = Column(Integer, default=0)
    views_count = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    author = relationship("User", back_populates="reports", foreign_keys=[author_id])
    moderator = relationship("User", back_populates="moderated_reports", foreign_keys=[moderator_id])
    images = relationship("ReportImage", back_populates="report", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="report", cascade="all, delete-orphan")


class ReportImage(Base):
    __tablename__ = "report_images"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    original_filename = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    report = relationship("Report", back_populates="images")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    is_official = Column(Boolean, default=False)  # Official response from moderator
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    report = relationship("Report", back_populates="comments")
    author = relationship("User", back_populates="comments")


class Reward(Base):
    __tablename__ = "rewards"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    points = Column(Integer, nullable=False)
    reason = Column(String(500), nullable=False)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="rewards")
