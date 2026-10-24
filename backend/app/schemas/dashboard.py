from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict


class RecentReportItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mission_title: str
    submitter_email: str
    submitted_at: datetime
    reviewed: bool


class DashboardStatsResponse(BaseModel):
    total_missions: int
    active_missions: int
    pending_reports: int
    recent_reports: List[RecentReportItem]
