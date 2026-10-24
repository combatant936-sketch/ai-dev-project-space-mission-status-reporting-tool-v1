from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import require_admin
from app.models.mission import Mission
from app.models.user import User
from app.schemas.missions import MissionCreate, MissionOut, MissionUpdate

router = APIRouter(prefix="/missions", tags=["missions"])


@router.post("", response_model=MissionOut, status_code=status.HTTP_201_CREATED)
def create_mission(
    payload: MissionCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Create a new space mission record (Admin only)."""
    mission = Mission(
        title=payload.title,
        description=payload.description,
        status=payload.status,
    )
    db.add(mission)
    db.commit()
    db.refresh(mission)
    return mission


@router.get("", response_model=List[MissionOut])
def list_missions(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """List all missions (Admin only)."""
    return db.query(Mission).all()


@router.get("/{id}", response_model=MissionOut)
def get_mission(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Get a single mission by ID (Admin only)."""
    mission = db.query(Mission).filter(Mission.id == id).first()
    if not mission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mission not found",
        )
    return mission


@router.patch("/{id}", response_model=MissionOut)
def update_mission(
    id: int,
    payload: MissionUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Partially update an existing mission by ID (Admin only)."""
    mission = db.query(Mission).filter(Mission.id == id).first()
    if not mission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mission not found",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(mission, field, value)

    db.commit()
    db.refresh(mission)
    return mission


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mission(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Delete a mission by ID (Admin only)."""
    mission = db.query(Mission).filter(Mission.id == id).first()
    if not mission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mission not found",
        )

    db.delete(mission)
    db.commit()
    return None
