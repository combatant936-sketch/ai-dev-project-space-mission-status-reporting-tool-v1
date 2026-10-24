from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship

from app.models.base import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    mission_id = Column(Integer, ForeignKey("missions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    current_status = Column(Text, nullable=True)
    progress_update = Column(Text, nullable=True)
    work_completed = Column(Text, nullable=True)
    blockers = Column(Text, nullable=True)
    reviewed = Column(Boolean, default=False, nullable=False)
    admin_comment = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    mission = relationship("Mission", back_populates="reports")
    author = relationship("User", back_populates="reports")
