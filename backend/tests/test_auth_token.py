"""Tests for Issue #4: Login and JWT Token Endpoint."""
import time
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.core.security import decode_access_token, get_password_hash
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

    # Seed a test user
    test_user = User(
        email="commander@nasa.gov",
        hashed_password=get_password_hash("ValidPassword123!"),
        role=Role.admin,
    )
    session.add(test_user)
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


def test_login_success_returns_200_and_token(client):
    """POST /auth/token with valid credentials returns HTTP 200 with access_token and bearer token_type."""
    response = client.post(
        "/auth/token",
        data={"username": "commander@nasa.gov", "password": "ValidPassword123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert len(data["access_token"]) > 20


def test_token_decodes_to_sub_and_exp(client):
    """The returned token decodes to a payload containing sub (user id or email) and exp."""
    response = client.post(
        "/auth/token",
        data={"username": "commander@nasa.gov", "password": "ValidPassword123!"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]

    payload = decode_access_token(token)
    assert "sub" in payload
    assert payload["sub"] == "commander@nasa.gov"
    assert "exp" in payload
    now_ts = int(datetime.now(timezone.utc).timestamp())
    assert payload["exp"] > now_ts


def test_login_wrong_password_returns_401(client):
    """Wrong password returns HTTP 401."""
    response = client.post(
        "/auth/token",
        data={"username": "commander@nasa.gov", "password": "WrongPassword999!"},
    )
    assert response.status_code == 401
    assert "incorrect email or password" in response.json()["detail"].lower()


def test_login_unknown_email_returns_401(client):
    """Unknown email returns HTTP 401."""
    response = client.post(
        "/auth/token",
        data={"username": "unknown@nasa.gov", "password": "ValidPassword123!"},
    )
    assert response.status_code == 401
    assert "incorrect email or password" in response.json()["detail"].lower()


def test_login_empty_password_returns_422(client):
    """Empty password field returns HTTP 422."""
    # Empty string in form field
    response_empty = client.post(
        "/auth/token",
        data={"username": "commander@nasa.gov", "password": ""},
    )
    assert response_empty.status_code == 422

    # Missing password field in form
    response_missing = client.post(
        "/auth/token",
        data={"username": "commander@nasa.gov"},
    )
    assert response_missing.status_code == 422


def test_token_expiry_configurable_via_env_var(client, monkeypatch):
    """Token expiry is configurable via environment variable ACCESS_TOKEN_EXPIRE_MINUTES; default is 30 minutes."""
    # Test default expiry (~30 minutes)
    res_default = client.post(
        "/auth/token",
        data={"username": "commander@nasa.gov", "password": "ValidPassword123!"},
    )
    assert res_default.status_code == 200
    payload_default = decode_access_token(res_default.json()["access_token"])
    now_ts = int(time.time())
    # 30 minutes = 1800 seconds; allow +- 10 seconds
    diff_default = payload_default["exp"] - now_ts
    assert 1780 <= diff_default <= 1820

    # Test configurable expiry (e.g. 60 minutes)
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    res_custom = client.post(
        "/auth/token",
        data={"username": "commander@nasa.gov", "password": "ValidPassword123!"},
    )
    assert res_custom.status_code == 200
    payload_custom = decode_access_token(res_custom.json()["access_token"])
    # 60 minutes = 3600 seconds; allow +- 10 seconds
    diff_custom = payload_custom["exp"] - now_ts
    assert 3580 <= diff_custom <= 3620


def test_secret_key_configurable_via_env_var(client, monkeypatch):
    """Signing uses SECRET_KEY from environment variable."""
    monkeypatch.setenv("SECRET_KEY", "super-custom-secret-key-for-test-suite")
    response = client.post(
        "/auth/token",
        data={"username": "commander@nasa.gov", "password": "ValidPassword123!"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    payload = decode_access_token(token)
    assert payload["sub"] == "commander@nasa.gov"
