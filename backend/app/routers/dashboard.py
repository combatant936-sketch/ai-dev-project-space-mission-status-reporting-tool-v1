from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.mission import Mission, MissionStatus
from app.models.report import Report
from app.models.user import User
from app.schemas.dashboard import DashboardStatsResponse, RecentReportItem

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Derive live dashboard statistics from database (Accessible by both roles)."""
    total_missions = db.query(Mission).count()
    active_missions = db.query(Mission).filter(Mission.status == MissionStatus.in_progress).count()
    pending_reports = db.query(Report).filter(Report.reviewed.is_(False)).count()

    recent_reports_raw = (
        db.query(Report)
        .order_by(Report.submitted_at.desc())
        .limit(5)
        .all()
    )

    recent_reports = [
        RecentReportItem(
            id=r.id,
            mission_title=r.mission.title if r.mission else "",
            submitter_email=r.author.email if r.author else "",
            submitted_at=r.submitted_at,
            reviewed=r.reviewed,
        )
        for r in recent_reports_raw
    ]

    missions_by_status = {
        MissionStatus.planned.value: db.query(Mission).filter(Mission.status == MissionStatus.planned).count(),
        MissionStatus.in_progress.value: active_missions,
        MissionStatus.completed.value: db.query(Mission).filter(Mission.status == MissionStatus.completed).count(),
        MissionStatus.failed.value: db.query(Mission).filter(Mission.status == MissionStatus.failed).count(),
    }

    return DashboardStatsResponse(
        total_missions=total_missions,
        active_missions=active_missions,
        pending_reports=pending_reports,
        recent_reports=recent_reports,
        missions_by_status=missions_by_status,
    )
