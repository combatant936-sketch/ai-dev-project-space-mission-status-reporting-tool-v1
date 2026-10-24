from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.mission import Mission
from app.models.report import Report
from app.models.user import Role, User
from app.schemas.reports import ReportCreate, ReportListItem, ReportOut, ReportReviewRequest

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


@router.get("/reports", response_model=List[ReportListItem], status_code=status.HTTP_200_OK)
def list_reports(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """List all reports across all missions, newest first (Admin only)."""
    reports = db.query(Report).order_by(Report.submitted_at.desc()).all()
    results = []
    for r in reports:
        results.append(
            ReportListItem(
                id=r.id,
                mission_id=r.mission_id,
                mission_title=r.mission.title if r.mission else "",
                submitter_email=r.author.email if r.author else "",
                submitted_at=r.submitted_at,
                reviewed=r.reviewed,
                admin_comment=r.admin_comment,
            )
        )
    return results


@router.patch("/reports/{id}/review", response_model=ReportOut, status_code=status.HTTP_200_OK)
def review_report(
    id: int,
    payload: ReportReviewRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Review a submitted report and optionally attach admin comments (Admin only)."""
    report = db.query(Report).filter(Report.id == id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )

    report.reviewed = payload.reviewed
    if payload.admin_comment is not None:
        report.admin_comment = payload.admin_comment

    db.commit()
    db.refresh(report)
    return report

