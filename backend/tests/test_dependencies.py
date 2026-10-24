"""Tests for Issue #5: Auth Middleware and Role-Based Guards."""
from datetime import timedelta
from unittest.mock import MagicMock

import pytest
from fastapi import Depends, FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.dependencies import get_current_user, require_admin
from app.models.user import Role, User


def test_dependencies_are_importable():
    """Dependencies live in backend/app/dependencies.py and are importable from there."""
    import app.dependencies as deps
    assert hasattr(deps, "get_current_user")
    assert hasattr(deps, "require_admin")


def test_unit_get_current_user_valid_token_mock_db():
    """Unit test: valid token resolves to user using mock db, without real DB or live server."""
    fake_user = User(id=1, email="unit@nasa.gov", role=Role.team_member)
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = fake_user

    token = create_access_token({"sub": "unit@nasa.gov"})
    resolved_user = get_current_user(token=token, db=mock_db)

    assert resolved_user == fake_user
    mock_db.query.assert_called_once()


def test_unit_get_current_user_invalid_token_fails_fast_without_db():
    """Unit test: invalid token signature raises 401 immediately without querying DB."""
    mock_db = MagicMock()
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token="invalid.malformed.token", db=mock_db)

    assert exc_info.value.status_code == 401
    mock_db.query.assert_not_called()


def test_unit_require_admin_guard():
    """Unit test: require_admin allows admin and rejects team_member with 403."""
    admin_user = User(id=1, email="admin@nasa.gov", role=Role.admin)
    member_user = User(id=2, email="member@nasa.gov", role=Role.team_member)

    # Admin passes without error
    assert require_admin(current_user=admin_user) == admin_user

    # Team member gets 403
    with pytest.raises(HTTPException) as exc_info:
        require_admin(current_user=member_user)
    assert exc_info.value.status_code == 403
    assert "admin privileges" in exc_info.value.detail.lower()


# Sample app with routes using the dependencies to test HTTP layer
sample_app = FastAPI()


@sample_app.get("/test-protected")
def protected_route(user: User = Depends(get_current_user)):
    return {"user_id": user.id, "email": user.email, "role": user.role.value}


@sample_app.get("/test-admin-only")
def admin_only_route(admin: User = Depends(require_admin)):
    return {"status": "ok", "admin_email": admin.email}


@pytest.fixture
def mock_db_client():
    """Client wired with a mock database provider."""
    mock_db = MagicMock()

    admin_user = User(id=1, email="admin@nasa.gov", role=Role.admin)
    member_user = User(id=2, email="member@nasa.gov", role=Role.team_member)
    users_by_email = {
        "admin@nasa.gov": admin_user,
        "member@nasa.gov": member_user,
    }

    def fake_query(model):
        q = MagicMock()
        def fake_filter(criterion):
            f = MagicMock()
            def fake_first():
                email_val = getattr(getattr(criterion, "right", None), "value", None)
                return users_by_email.get(email_val)
            f.first = fake_first
            return f
        q.filter = fake_filter
        return q

    mock_db.query = fake_query

    from app.core.database import get_db
    sample_app.dependency_overrides[get_db] = lambda: mock_db
    with TestClient(sample_app) as client:
        yield client
    sample_app.dependency_overrides.clear()



def test_http_request_with_valid_bearer_token(mock_db_client):
    """A request with a valid JWT in Authorization: Bearer <token> resolves get_current_user."""
    token = create_access_token({"sub": "member@nasa.gov"})
    response = mock_db_client.get(
        "/test-protected",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == "member@nasa.gov"


def test_http_request_with_no_authorization_header_returns_401(mock_db_client):
    """A request with no Authorization header returns HTTP 401."""
    response = mock_db_client.get("/test-protected")
    assert response.status_code == 401


def test_http_request_with_malformed_token_returns_401(mock_db_client):
    """A request with a malformed token returns HTTP 401."""
    response = mock_db_client.get(
        "/test-protected",
        headers={"Authorization": "Bearer malformed.jwt.token"},
    )
    assert response.status_code == 401


def test_http_request_with_expired_token_returns_401(mock_db_client):
    """A request with an expired token returns HTTP 401."""
    expired_token = create_access_token(
        {"sub": "member@nasa.gov"},
        expires_delta=timedelta(seconds=-10),
    )
    response = mock_db_client.get(
        "/test-protected",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401


def test_http_team_member_hitting_require_admin_returns_403(mock_db_client):
    """A request from a team_member hitting a route that depends on require_admin returns HTTP 403."""
    token = create_access_token({"sub": "member@nasa.gov"})
    response = mock_db_client.get(
        "/test-admin-only",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert "admin privileges" in response.json()["detail"].lower()


def test_http_admin_user_passes_require_admin_without_error(mock_db_client):
    """A request from an admin user passes require_admin without error."""
    token = create_access_token({"sub": "admin@nasa.gov"})
    response = mock_db_client.get(
        "/test-admin-only",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["admin_email"] == "admin@nasa.gov"
