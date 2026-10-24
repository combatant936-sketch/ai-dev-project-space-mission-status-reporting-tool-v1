"""Tests for Issue #10: Dashboard Stats Endpoint."""
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
def member_user(test_db_session):
    user = User(
        email="dash_member@nasa.gov",
        hashed_password=get_password_hash("Pass123!"),
        role=Role.team_member,
    )
    test_db_session.add(user)
    test_db_session.commit()
    return user


@pytest.fixture
def admin_user(test_db_session):
    user = User(
        email="dash_admin@nasa.gov",
        hashed_password=get_password_hash("Pass123!"),
        role=Role.admin,
    )
    test_db_session.add(user)
    test_db_session.commit()
    return user


@pytest.fixture
def member_headers(member_user):
    token = create_access_token({"sub": member_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(admin_user):
    token = create_access_token({"sub": admin_user.email})
    return {"Authorization": f"Bearer {token}"}


def test_dashboard_empty_database(client, member_headers):
    """When there are no missions or reports, all counts are 0 and recent_reports is empty list."""
    res = client.get("/dashboard", headers=member_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_missions"] == 0
    assert data["active_missions"] == 0
    assert data["pending_reports"] == 0
    assert data["recent_reports"] == []


def test_dashboard_exact_counts_and_recent_reports(client, test_db_session, member_user, member_headers):
    """Tests use a known fixture dataset and assert exact counts."""
    # 3 missions: 2 in_progress, 1 planned
    m1 = Mission(title="Mission Alpha", status=MissionStatus.in_progress)
    m2 = Mission(title="Mission Beta", status=MissionStatus.in_progress)
    m3 = Mission(title="Mission Gamma", status=MissionStatus.planned)
    test_db_session.add_all([m1, m2, m3])
    test_db_session.commit()

    # 3 reports: 2 unreviewed (pending), 1 reviewed
    now = datetime.utcnow()
    r1 = Report(mission_id=m1.id, user_id=member_user.id, current_status="in_progress", submitted_at=now - timedelta(days=2), reviewed=False)
    r2 = Report(mission_id=m2.id, user_id=member_user.id, current_status="in_progress", submitted_at=now - timedelta(days=1), reviewed=True)
    r3 = Report(mission_id=m3.id, user_id=member_user.id, current_status="planned", submitted_at=now, reviewed=False)
    test_db_session.add_all([r1, r2, r3])
    test_db_session.commit()

    res = client.get("/dashboard", headers=member_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_missions"] == 3
    assert data["active_missions"] == 2
    assert data["pending_reports"] == 2

    # When fewer than 5 reports, contains all 3
    assert len(data["recent_reports"]) == 3

    # Check newest first order
    assert data["recent_reports"][0]["id"] == r3.id
    assert data["recent_reports"][1]["id"] == r2.id
    assert data["recent_reports"][2]["id"] == r1.id

    # Check items fields: id, mission_title, submitter_email, submitted_at, reviewed
    first = data["recent_reports"][0]
    assert first["mission_title"] == "Mission Gamma"
    assert first["submitter_email"] == "dash_member@nasa.gov"
    assert first["reviewed"] is False


def test_dashboard_caps_recent_reports_at_5(client, test_db_session, member_user, admin_headers):
    """When there are more than 5 reports, recent_reports contains up to 5 ordered by submitted_at desc."""
    m = Mission(title="Mission Long", status=MissionStatus.in_progress)
    test_db_session.add(m)
    test_db_session.commit()

    now = datetime.utcnow()
    reports = [
        Report(
            mission_id=m.id,
            user_id=member_user.id,
            current_status="in_progress",
            submitted_at=now - timedelta(days=i),
            reviewed=False,
        )
        for i in range(8)
    ]
    test_db_session.add_all(reports)
    test_db_session.commit()

    # Accessible by admin as well
    res = client.get("/dashboard", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["recent_reports"]) == 5
    assert data["recent_reports"][0]["submitted_at"] > data["recent_reports"][4]["submitted_at"]


def test_dashboard_requires_auth(client):
    """The endpoint returns HTTP 401 with no token."""
    res = client.get("/dashboard")
    assert res.status_code == 401
