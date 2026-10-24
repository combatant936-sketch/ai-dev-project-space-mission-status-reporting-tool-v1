from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.user import Role


class UserRegisterRequest(BaseModel):
    email: str = Field(..., min_length=1, description="User email address")
    password: str = Field(..., min_length=8, description="Password with minimum 8 characters")
    role: Optional[Role] = Field(default=Role.team_member, description="User role, defaults to team_member")


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: Role
    created_at: Optional[datetime] = None
