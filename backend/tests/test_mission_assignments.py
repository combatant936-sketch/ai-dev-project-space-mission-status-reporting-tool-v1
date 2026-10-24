"""Tests for Issue #7: Mission Assignment Endpoint."""
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

    # Seed an admin, three team members, and a mission
    admin = User(
        email="admin_assign@nasa.gov",
        hashed_password=get_password_hash("Pass123!"),
        role=Role.admin,
    )
    member1 = User(
        email="member1_assign@nasa.gov",
        hashed_password=get_password_hash("Pass123!"),
        role=Role.team_member,
    )
    member2 = User(
        email="member2_assign@nasa.gov",
        hashed_password=get_password_hash("Pass123!"),
        role=Role.team_member,
    )
    member3 = User(
        email="member3_assign@nasa.gov",
        hashed_password=get_password_hash("Pass123!"),
        role=Role.team_member,
    )
    mission = Mission(
        title="Hubble Maintenance",
        description="Servicing Hubble telescope",
        status=MissionStatus.in_progress,
    )
    session.add_all([admin, member1, member2, member3, mission])
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
    token = create_access_token({"sub": "admin_assign@nasa.gov"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def member_headers():
    token = create_access_token({"sub": "member1_assign@nasa.gov"})
    return {"Authorization": f"Bearer {token}"}


def test_assign_successful(client, test_db_session, admin_headers):
    """POST /missions/{id}/assign with valid user_ids returns HTTP 200 and list of assigned user IDs."""
    m = test_db_session.query(Mission).first()
    u1 = test_db_session.query(User).filter(User.email == "member1_assign@nasa.gov").first()
    u2 = test_db_session.query(User).filter(User.email == "member2_assign@nasa.gov").first()

    res = client.post(
        f"/missions/{m.id}/assign",
        json={"user_ids": [u1.id, u2.id]},
        headers=admin_headers,
    )
    assert res.status_code == 200
    assigned = res.json()
    assert set(assigned) == {u1.id, u2.id}


def test_assign_replace_semantics(client, test_db_session, admin_headers):
    """Calling endpoint again with different list replaces (not appends) assignment list."""
    m = test_db_session.query(Mission).first()
    u1 = test_db_session.query(User).filter(User.email == "member1_assign@nasa.gov").first()
    u2 = test_db_session.query(User).filter(User.email == "member2_assign@nasa.gov").first()
    u3 = test_db_session.query(User).filter(User.email == "member3_assign@nasa.gov").first()

    # Initial assignment [u1, u2]
    client.post(
        f"/missions/{m.id}/assign",
        json={"user_ids": [u1.id, u2.id]},
        headers=admin_headers,
    )

    # Re-assign to [u3]
    res = client.post(
        f"/missions/{m.id}/assign",
        json={"user_ids": [u3.id]},
        headers=admin_headers,
    )
    assert res.status_code == 200
    assert res.json() == [u3.id]


def test_assign_empty_clears_all_assignments(client, test_db_session, admin_headers):
    """Passing {'user_ids': []} clears all assignments and returns HTTP 200 with an empty list."""
    m = test_db_session.query(Mission).first()
    u1 = test_db_session.query(User).filter(User.email == "member1_assign@nasa.gov").first()

    # Assign first
    client.post(
        f"/missions/{m.id}/assign",
        json={"user_ids": [u1.id]},
        headers=admin_headers,
    )

    # Clear with []
    res = client.post(
        f"/missions/{m.id}/assign",
        json={"user_ids": []},
        headers=admin_headers,
    )
    assert res.status_code == 200
    assert res.json() == []


def test_assign_mission_not_found(client, admin_headers):
    """Returns HTTP 404 when the mission id does not exist."""
    res = client.post(
        "/missions/9999/assign",
        json={"user_ids": [1]},
        headers=admin_headers,
    )
    assert res.status_code == 404


def test_assign_user_not_found_no_partial_assignment(client, test_db_session, admin_headers):
    """Returns HTTP 404 when any supplied user_id does not exist; no partial assignment is made."""
    m = test_db_session.query(Mission).first()
    u1 = test_db_session.query(User).filter(User.email == "member1_assign@nasa.gov").first()

    res = client.post(
        f"/missions/{m.id}/assign",
        json={"user_ids": [u1.id, 99999]},
        headers=admin_headers,
    )
    assert res.status_code == 404

    # Verify no partial assignment was made
    test_db_session.refresh(m)
    assert len(m.assigned_users) == 0


def test_assign_admin_role_rejected_with_422(client, test_db_session, admin_headers):
    """Assigning a user with role admin is rejected with HTTP 422."""
    m = test_db_session.query(Mission).first()
    admin_user = test_db_session.query(User).filter(User.role == Role.admin).first()

    res = client.post(
        f"/missions/{m.id}/assign",
        json={"user_ids": [admin_user.id]},
        headers=admin_headers,
    )
    assert res.status_code == 422
    assert "only team members can be assigned" in res.json()["detail"].lower()


def test_assign_forbidden_for_team_member(client, test_db_session, member_headers):
    """Returns HTTP 403 when called by a team_member."""
    m = test_db_session.query(Mission).first()
    res = client.post(
        f"/missions/{m.id}/assign",
        json={"user_ids": [1]},
        headers=member_headers,
    )
    assert res.status_code == 403


def test_assign_requires_auth(client, test_db_session):
    """Returns HTTP 401 when no token is provided."""
    m = test_db_session.query(Mission).first()
    res = client.post(
        f"/missions/{m.id}/assign",
        json={"user_ids": [1]},
    )
    assert res.status_code == 401
