"""User model - Foydalanuvchilar jadvali."""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    USER = "user"
    MODERATOR = "moderator"
    ADMIN = "admin"
    ORGANIZATION = "organization"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)

    # Role & Status
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    # Organization info (for moderators/organizations)
    organization_name = Column(String(255), nullable=True)
    organization_type = Column(String(100), nullable=True)  # "ekologiya", "yol_qurilish", etc.

    # Gamification / Rewards
    points = Column(Integer, default=0)
    reports_count = Column(Integer, default=0)
    verified_reports_count = Column(Integer, default=0)
    rank = Column(String(50), default="Yangi")  # Yangi, Faol, Ekspert, Lider

    # Avatar
    avatar_url = Column(String(500), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    reports = relationship("Report", back_populates="author", foreign_keys="Report.author_id")
    moderated_reports = relationship("Report", back_populates="moderator", foreign_keys="Report.moderator_id")
    comments = relationship("Comment", back_populates="author")
    rewards = relationship("Reward", back_populates="user")

    def update_rank(self):
        """Update user rank based on verified reports."""
        if self.verified_reports_count >= 50:
            self.rank = "Lider"
        elif self.verified_reports_count >= 20:
            self.rank = "Ekspert"
        elif self.verified_reports_count >= 5:
            self.rank = "Faol"
        else:
            self.rank = "Yangi"
