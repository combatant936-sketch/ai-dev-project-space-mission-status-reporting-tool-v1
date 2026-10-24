from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.mission import MissionStatus


class MissionCreate(BaseModel):
    title: str = Field(..., min_length=1, description="Mission title")
    description: Optional[str] = Field(None, description="Detailed description of the mission")
    status: Optional[MissionStatus] = Field(default=MissionStatus.planned, description="Current mission status")


class MissionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, description="Mission title")
    description: Optional[str] = Field(None, description="Detailed description of the mission")
    status: Optional[MissionStatus] = Field(None, description="Current mission status")


from app.schemas.auth import UserResponse


class MissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    status: MissionStatus
    created_at: datetime
    assigned_users: list[UserResponse] = []



class MissionAssignRequest(BaseModel):
    user_ids: list[int] = Field(..., description="List of team member user IDs to assign to the mission")

