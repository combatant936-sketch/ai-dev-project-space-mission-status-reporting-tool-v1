"""Tests for Issue #3: User Registration and Password Hashing Endpoint."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.core.security import verify_password
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



def test_register_success_returns_201_and_id_email(client):
    """POST /auth/register with valid fields returns HTTP 201 and id, email without password exposure."""
    response = client.post(
        "/auth/register",
        json={"email": "astronaut@nasa.gov", "password": "SecurePassword123!", "role": "team_member"},
    )
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["email"] == "astronaut@nasa.gov"
    assert "password" not in data
    assert "hashed_password" not in data


def test_register_stored_password_is_hashed(client, test_db_session):
    """The stored hashed_password column is never plain-text copy of input password."""
    raw_password = "SuperSecretPassword123!"
    response = client.post(
        "/auth/register",
        json={"email": "hashing_test@nasa.gov", "password": raw_password, "role": "team_member"},
    )
    assert response.status_code == 201
    user_id = response.json()["id"]

    db_user = test_db_session.query(User).filter(User.id == user_id).first()
    assert db_user is not None
    assert db_user.hashed_password != raw_password
    assert db_user.hashed_password.startswith("$2")
    assert verify_password(raw_password, db_user.hashed_password) is True


def test_register_duplicate_email_returns_409(client):
    """Posting the same email a second time returns HTTP 409 with a clear error message."""
    payload = {"email": "duplicate@nasa.gov", "password": "ValidPassword123", "role": "team_member"}
    res1 = client.post("/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/auth/register", json=payload)
    assert res2.status_code == 409
    data = res2.json()
    assert "detail" in data
    assert "already registered" in data["detail"].lower()


def test_register_missing_email_returns_422(client):
    """Missing email field returns HTTP 422."""
    response = client.post(
        "/auth/register",
        json={"password": "ValidPassword123", "role": "team_member"},
    )
    assert response.status_code == 422


def test_register_missing_password_returns_422(client):
    """Missing password field returns HTTP 422."""
    response = client.post(
        "/auth/register",
        json={"email": "missing_pw@nasa.gov", "role": "team_member"},
    )
    assert response.status_code == 422


def test_register_role_defaults_to_team_member(client, test_db_session):
    """role field defaults to team_member if omitted."""
    response = client.post(
        "/auth/register",
        json={"email": "default_role@nasa.gov", "password": "ValidPassword123"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["role"] == "team_member"

    db_user = test_db_session.query(User).filter(User.id == data["id"]).first()
    assert db_user.role == Role.team_member


def test_register_admin_role_can_be_supplied_and_stored(client, test_db_session):
    """An admin role can be supplied and is stored correctly."""
    response = client.post(
        "/auth/register",
        json={"email": "commander@nasa.gov", "password": "ValidPassword123", "role": "admin"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["role"] == "admin"

    db_user = test_db_session.query(User).filter(User.id == data["id"]).first()
    assert db_user.role == Role.admin


def test_register_password_shorter_than_8_chars_returns_422(client):
    """A password shorter than 8 characters is rejected with HTTP 422."""
    response = client.post(
        "/auth/register",
        json={"email": "short_pw@nasa.gov", "password": "short7", "role": "team_member"},
    )
    assert response.status_code == 422
