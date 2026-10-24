"""Tests for Issue #9: Report Review Endpoints (Admin)."""
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash
from app.main import app as fastapi_app
from app.models.base import Base
import app.models  # noqa: F401
from app.models.mission import Mission, MissionStatus
from app.models.report import Report
from app.models.user import Role, User


@pytest.fixture
def test_db_session():
    """Create an isolated in-memory SQLite database session for each test."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    # Seed admin, member, mission, and two reports
    admin = User(
        email="admin_review@nasa.gov",
        hashed_password=get_password_hash("Pass123!"),
        role=Role.admin,
    )
    member = User(
        email="member_review@nasa.gov",
        hashed_password=get_password_hash("Pass123!"),
        role=Role.team_member,
    )
    mission = Mission(
        title="Voyager Deep Space",
        description="Interstellar probe",
        status=MissionStatus.in_progress,
    )
    session.add_all([admin, member, mission])
    session.commit()

    now = datetime.utcnow()
    report1 = Report(
        mission_id=mission.id,
        user_id=member.id,
        current_status="in_progress",
        progress_update="Older report",
        submitted_at=now - timedelta(days=2),
        reviewed=False,
    )
    report2 = Report(
        mission_id=mission.id,
        user_id=member.id,
        current_status="in_progress",
        progress_update="Newer report",
        submitted_at=now,
        reviewed=False,
    )
    session.add_all([report1, report2])
    session.commit()

    yield session

    session.close()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def client(test_db_session):
    """FastAPI TestClient with overridden get_db dependency."""
    def override_get_db():
        try:
            yield test_db_session
        finally:
            pass

    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app) as test_client:
        yield test_client
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def admin_headers():
    token = create_access_token({"sub": "admin_review@nasa.gov"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def member_headers():
    token = create_access_token({"sub": "member_review@nasa.gov"})
    return {"Authorization": f"Bearer {token}"}


def test_list_reports_newest_first_with_fields(client, admin_headers):
    """GET /reports returns HTTP 200, list ordered newest first, with all required fields."""
    res = client.get("/reports", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2

    # Check newest first order
    assert data[0]["submitted_at"] > data[1]["submitted_at"]

    # Check fields in items
    first = data[0]
    required_keys = {"id", "mission_id", "mission_title", "submitter_email", "submitted_at", "reviewed", "admin_comment"}
    assert required_keys.issubset(set(first.keys()))
    assert first["mission_title"] == "Voyager Deep Space"
    assert first["submitter_email"] == "member_review@nasa.gov"
    assert first["reviewed"] is False


def test_review_report_with_comment(client, test_db_session, admin_headers):
    """PATCH /reports/{id}/review with reviewed and admin_comment returns HTTP 200 and updated report."""
    rep = test_db_session.query(Report).first()
    res = client.patch(
        f"/reports/{rep.id}/review",
        json={"reviewed": True, "admin_comment": "Looks good"},
        headers=admin_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["reviewed"] is True
    assert data["admin_comment"] == "Looks good"


def test_review_report_without_comment_remains_null(client, test_db_session, admin_headers):
    """PATCH /reports/{id}/review with reviewed and no comment returns HTTP 200; admin_comment remains null."""
    rep = test_db_session.query(Report).first()
    res = client.patch(
        f"/reports/{rep.id}/review",
        json={"reviewed": True},
        headers=admin_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["reviewed"] is True
    assert data["admin_comment"] is None


def test_review_report_not_found_returns_404(client, admin_headers):
    """PATCH /reports/{id}/review with an unknown id returns HTTP 404."""
    res = client.patch(
        "/reports/99999/review",
        json={"reviewed": True},
        headers=admin_headers,
    )
    assert res.status_code == 404


def test_endpoints_return_401_no_token(client):
    """Both endpoints return HTTP 401 with no token."""
    assert client.get("/reports").status_code == 401
    assert client.patch("/reports/1/review", json={"reviewed": True}).status_code == 401


def test_endpoints_return_403_for_team_member(client, member_headers):
    """Both endpoints return HTTP 403 for a team-member token."""
    assert client.get("/reports", headers=member_headers).status_code == 403
    assert client.patch("/reports/1/review", json={"reviewed": True}, headers=member_headers).status_code == 403
