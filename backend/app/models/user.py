import enum
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, Integer, String, Table, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship

from app.models.base import Base

# Many-to-many join table: mission_assignments
mission_assignments = Table(
    "mission_assignments",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("mission_id", Integer, ForeignKey("missions.id"), primary_key=True),
)


class Role(str, enum.Enum):
    admin = "admin"
    team_member = "team_member"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(Role), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    assigned_missions = relationship(
        "Mission", secondary=mission_assignments, back_populates="assigned_users"
    )
    reports = relationship("Report", back_populates="author")
