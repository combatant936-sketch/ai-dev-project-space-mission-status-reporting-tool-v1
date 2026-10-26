"""Integration test against a live PostgreSQL database.

Runs only when DATABASE_URL points to a PostgreSQL instance (i.e. starts with
"postgresql").  In CI the workflow spins up a postgres service container and
sets DATABASE_URL accordingly.  Locally against SQLite the test is skipped.
"""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.database import get_db
from app.main import app as fastapi_app
from app.models.base import Base
import app.models  # noqa: F401  – registers all ORM models


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dev.db")

pytestmark = pytest.mark.skipif(
    not DATABASE_URL.startswith("postgresql"),
    reason="PostgreSQL integration test – set DATABASE_URL to a postgres:// URL to run",
)


@pytest.fixture(scope="module")
def pg_client():
    """Create schema on the real PG instance, yield a TestClient, then drop."""
    engine = create_engine(DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app) as client:
        yield client

    fastapi_app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_pg_health(pg_client):
    """Health endpoint should return 200 against a live PG-backed app."""
    resp = pg_client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_pg_register_login_and_create_mission(pg_client):
    """Full happy-path: register admin → login → create mission → read mission."""
    # 1. Register admin
    reg = pg_client.post(
        "/auth/register",
        json={
            "email": "pg_admin@nasa.gov",
            "password": "PgAdmin2026!",
            "role": "admin",
        },
    )
    assert reg.status_code == 201, reg.text
    assert reg.json()["email"] == "pg_admin@nasa.gov"

    # 2. Login
    login = pg_client.post(
        "/auth/token",
        data={"username": "pg_admin@nasa.gov", "password": "PgAdmin2026!"},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create mission
    mission = pg_client.post(
        "/missions",
        json={
            "title": "PG Integration Mission",
            "description": "Automated CI integration test mission",
            "status": "planned",
        },
        headers=headers,
    )
    assert mission.status_code == 201, mission.text
    mid = mission.json()["id"]

    # 4. Read mission back
    get_resp = pg_client.get(f"/missions/{mid}", headers=headers)
    assert get_resp.status_code == 200, get_resp.text
    assert get_resp.json()["title"] == "PG Integration Mission"
