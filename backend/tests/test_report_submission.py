"""Tests for Issue #8: Weekly Report Submission Endpoint (Team Member)."""
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

    # Seed an admin, an assigned team member, and an unassigned team member
    admin = User(
        email="admin_report@nasa.gov",
        hashed_password=get_password_hash("Pass123!"),
        role=Role.admin,
    )
    assigned_member = User(
        email="assigned_member@nasa.gov",
        hashed_password=get_password_hash("Pass123!"),
        role=Role.team_member,
    )
    unassigned_member = User(
        email="unassigned_member@nasa.gov",
        hashed_password=get_password_hash("Pass123!"),
        role=Role.team_member,
    )
    mission = Mission(
        title="Perseverance Rover",
        description="Mars sample return preparation",
        status=MissionStatus.in_progress,
    )
    mission.assigned_users.append(assigned_member)
    session.add_all([admin, assigned_member, unassigned_member, mission])
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
def assigned_member_headers():
    token = create_access_token({"sub": "assigned_member@nasa.gov"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def unassigned_member_headers():
    token = create_access_token({"sub": "unassigned_member@nasa.gov"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers():
    token = create_access_token({"sub": "admin_report@nasa.gov"})
    return {"Authorization": f"Bearer {token}"}


def test_submit_report_success(client, test_db_session, assigned_member_headers):
    """POST /missions/{id}/reports by assigned team member returns HTTP 201 with id and submitted_at."""
    m = test_db_session.query(Mission).first()
    payload = {
        "current_status": "in_progress",
        "progress_update": "Core sample collected successfully",
        "work_completed": "Drilled target 4",
        "blockers": "Minor dust storm",
    }
    res = client.post(
        f"/missions/{m.id}/reports",
        json=payload,
        headers=assigned_member_headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert "id" in data
    assert "submitted_at" in data
    assert data["mission_id"] == m.id
    assert data["current_status"] == "in_progress"
    assert data["reviewed"] is False


def test_submit_report_unassigned_member_returns_403(client, test_db_session, unassigned_member_headers):
    """Calling the endpoint when user is not assigned to mission returns HTTP 403."""
    m = test_db_session.query(Mission).first()
    res = client.post(
        f"/missions/{m.id}/reports",
        json={"current_status": "planned"},
        headers=unassigned_member_headers,
    )
    assert res.status_code == 403
    assert "not assigned" in res.json()["detail"].lower()


def test_submit_report_unknown_mission_returns_404(client, assigned_member_headers):
    """Calling the endpoint for a mission that does not exist returns HTTP 404."""
    res = client.post(
        "/missions/99999/reports",
        json={"current_status": "in_progress"},
        headers=assigned_member_headers,
    )
    assert res.status_code == 404


def test_submit_report_as_admin_returns_403(client, test_db_session, admin_headers):
    """Calling the endpoint as an admin returns HTTP 403 (admins do not submit reports)."""
    m = test_db_session.query(Mission).first()
    res = client.post(
        f"/missions/{m.id}/reports",
        json={"current_status": "in_progress"},
        headers=admin_headers,
    )
    assert res.status_code == 403
    assert "admins cannot submit" in res.json()["detail"].lower()


def test_submit_report_missing_current_status_returns_422(client, test_db_session, assigned_member_headers):
    """Missing current_status field returns HTTP 422."""
    m = test_db_session.query(Mission).first()
    res = client.post(
        f"/missions/{m.id}/reports",
        json={"progress_update": "Working without status"},
        headers=assigned_member_headers,
    )
    assert res.status_code == 422


def test_submit_report_invalid_status_value_returns_422(client, test_db_session, assigned_member_headers):
    """current_status must be one of the four mission status values; invalid string returns 422."""
    m = test_db_session.query(Mission).first()
    res = client.post(
        f"/missions/{m.id}/reports",
        json={"current_status": "flying_high"},
        headers=assigned_member_headers,
    )
    assert res.status_code == 422


def test_submit_multiple_reports_same_mission(client, test_db_session, assigned_member_headers):
    """A team member can submit multiple reports for the same mission."""
    m = test_db_session.query(Mission).first()
    res1 = client.post(
        f"/missions/{m.id}/reports",
        json={"current_status": "in_progress", "progress_update": "Week 1"},
        headers=assigned_member_headers,
    )
    assert res1.status_code == 201

    res2 = client.post(
        f"/missions/{m.id}/reports",
        json={"current_status": "in_progress", "progress_update": "Week 2"},
        headers=assigned_member_headers,
    )
    assert res2.status_code == 201
    assert res1.json()["id"] != res2.json()["id"]
