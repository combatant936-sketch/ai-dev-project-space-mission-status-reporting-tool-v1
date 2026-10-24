from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.mission import MissionStatus


class ReportCreate(BaseModel):
    current_status: MissionStatus = Field(..., description="Must be one of the four mission status values")
    progress_update: Optional[str] = Field(None, description="Progress update summary")
    work_completed: Optional[str] = Field(None, description="Detailed work completed")
    blockers: Optional[str] = Field(None, description="Any blockers encountered")


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mission_id: int
    user_id: int
    current_status: Optional[str] = None
    progress_update: Optional[str] = None
    work_completed: Optional[str] = None
    blockers: Optional[str] = None
    reviewed: bool
    admin_comment: Optional[str] = None
    submitted_at: datetime
