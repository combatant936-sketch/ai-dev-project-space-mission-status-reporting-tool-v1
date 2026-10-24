from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.mission import Mission
from app.models.report import Report
from app.models.user import Role, User
from app.schemas.reports import ReportCreate, ReportOut

router = APIRouter(tags=["reports"])


@router.post("/missions/{id}/reports", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def submit_weekly_report(
    id: int,
    payload: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a weekly status report for an assigned mission (Team member only)."""
    if current_user.role == Role.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins cannot submit weekly reports",
        )

    mission = db.query(Mission).filter(Mission.id == id).first()
    if not mission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mission not found",
        )

    assigned_user_ids = {u.id for u in mission.assigned_users}
    if current_user.id not in assigned_user_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not assigned to this mission",
        )

    report = Report(
        mission_id=mission.id,
        user_id=current_user.id,
        current_status=payload.current_status.value if hasattr(payload.current_status, "value") else str(payload.current_status),
        progress_update=payload.progress_update,
        work_completed=payload.work_completed,
        blockers=payload.blockers,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
