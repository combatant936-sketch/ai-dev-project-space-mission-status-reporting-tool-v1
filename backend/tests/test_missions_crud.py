"""Tests for Issue #6: Mission CRUD Endpoints (Admin)."""
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

    # Seed an admin user and a team member user
    admin_user = User(
        email="admin_crud@nasa.gov",
        hashed_password=get_password_hash("AdminPass123!"),
        role=Role.admin,
    )
    member_user = User(
        email="member_crud@nasa.gov",
        hashed_password=get_password_hash("MemberPass123!"),
        role=Role.team_member,
    )
    session.add_all([admin_user, member_user])
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
    token = create_access_token({"sub": "admin_crud@nasa.gov"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def member_headers():
    token = create_access_token({"sub": "member_crud@nasa.gov"})
    return {"Authorization": f"Bearer {token}"}


def test_create_mission_success(client, admin_headers):
    """POST /missions with valid payload returns HTTP 201 and created mission with id."""
    payload = {
        "title": "Artemis III",
        "description": "Crewed lunar landing mission",
        "status": "planned",
    }
    response = client.post("/missions", json=payload, headers=admin_headers)
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["title"] == "Artemis III"
    assert data["description"] == "Crewed lunar landing mission"
    assert data["status"] == "planned"


def test_list_missions_empty_and_populated(client, admin_headers):
    """GET /missions returns HTTP 200 with all missions, empty list when none exist."""
    res_empty = client.get("/missions", headers=admin_headers)
    assert res_empty.status_code == 200
    assert res_empty.json() == []

    client.post("/missions", json={"title": "Mission 1"}, headers=admin_headers)
    client.post("/missions", json={"title": "Mission 2"}, headers=admin_headers)

    res_populated = client.get("/missions", headers=admin_headers)
    assert res_populated.status_code == 200
    assert len(res_populated.json()) == 2


def test_get_mission_by_id_and_not_found(client, admin_headers):
    """GET /missions/{id} returns HTTP 200 on success, HTTP 404 for unknown id."""
    created = client.post("/missions", json={"title": "Europa Clipper"}, headers=admin_headers).json()
    mission_id = created["id"]

    res = client.get(f"/missions/{mission_id}", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["title"] == "Europa Clipper"

    res_404 = client.get("/missions/9999", headers=admin_headers)
    assert res_404.status_code == 404


def test_patch_mission_partial_update_and_not_found(client, admin_headers):
    """PATCH /missions/{id} updates only supplied fields, returns 404 for unknown id."""
    created = client.post(
        "/missions",
        json={"title": "James Webb", "description": "Space Telescope", "status": "planned"},
        headers=admin_headers,
    ).json()
    mission_id = created["id"]

    patch_res = client.patch(
        f"/missions/{mission_id}",
        json={"status": "in_progress"},
        headers=admin_headers,
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["status"] == "in_progress"
    assert updated["title"] == "James Webb"
    assert updated["description"] == "Space Telescope"

    patch_404 = client.patch("/missions/9999", json={"status": "completed"}, headers=admin_headers)
    assert patch_404.status_code == 404


def test_delete_mission_and_not_found(client, admin_headers):
    """DELETE /missions/{id} returns HTTP 204, record is deleted, returns 404 for unknown id."""
    created = client.post("/missions", json={"title": "Voyager 1"}, headers=admin_headers).json()
    mission_id = created["id"]

    del_res = client.delete(f"/missions/{mission_id}", headers=admin_headers)
    assert del_res.status_code == 204

    # Verify no longer in list
    list_res = client.get("/missions", headers=admin_headers)
    assert len(list_res.json()) == 0

    # Unknown id returns 404
    del_404 = client.delete(f"/missions/{mission_id}", headers=admin_headers)
    assert del_404.status_code == 404


def test_all_five_endpoints_require_auth(client):
    """All five endpoints return HTTP 401 when no token is provided."""
    assert client.post("/missions", json={"title": "No Auth"}).status_code == 401
    assert client.get("/missions").status_code == 401
    assert client.get("/missions/1").status_code == 401
    assert client.patch("/missions/1", json={"title": "No Auth"}).status_code == 401
    assert client.delete("/missions/1").status_code == 401


def test_admin_endpoints_forbidden_for_team_member(client, member_headers):
    """Admin-only modification endpoints return HTTP 403 when called by a team_member token."""
    assert client.post("/missions", json={"title": "Member Post"}, headers=member_headers).status_code == 403
    assert client.patch("/missions/1", json={"title": "Member Patch"}, headers=member_headers).status_code == 403
    assert client.delete("/missions/1", headers=member_headers).status_code == 403
    # GET /missions is allowed for authenticated team members to filter their assigned missions
    assert client.get("/missions", headers=member_headers).status_code == 200


def test_create_mission_missing_title_returns_422(client, admin_headers):
    """POST /missions with missing title returns HTTP 422."""
    res = client.post("/missions", json={"description": "No Title"}, headers=admin_headers)
    assert res.status_code == 422
