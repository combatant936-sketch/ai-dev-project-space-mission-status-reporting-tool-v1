from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import Role, User
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=List[UserResponse])
def list_users(
    role: Optional[Role] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List users, optionally filtered by role (e.g. ?role=team_member)."""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.all()
