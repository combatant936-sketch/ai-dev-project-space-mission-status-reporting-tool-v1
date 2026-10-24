"""End-to-End integration test covering the complete user journey (Issue #18).

Exercises the entire user lifecycle across all backend APIs:
1. Register admin user via POST /auth/register
2. Log in as admin via POST /auth/token and retrieve valid JWT
3. Create a mission via POST /missions
4. Register a team member and assign to the mission via POST /missions/{id}/assign
5. Log in as team member and submit report via POST /missions/{id}/reports
6. Log in as admin and mark report reviewed via PATCH /reports/{id}/review
7. Fetch GET /dashboard and assert exact operational metrics:
   total_missions = 1, active_missions = 0 (planned), pending_reports = 0 (reviewed)
"""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import app as fastapi_app
from app.models.base import Base
import app.models  # noqa: F401


@pytest.fixture
def clean_db():
    """Create an isolated, in-memory SQLite database session for the E2E journey."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    def override_get_db():
        try:
            yield session
        finally:
            pass

    fastapi_app.dependency_overrides[get_db] = override_get_db

    yield session

    fastapi_app.dependency_overrides.clear()
    session.close()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.mark.anyio
async def test_full_user_journey_e2e(clean_db):
    """Execute end-to-end user lifecycle test using AsyncClient with ASGI transport."""
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Register admin user
        admin_register_resp = await client.post(
            "/auth/register",
            json={
                "email": "flight_director@nasa.gov",
                "password": "DirectorSecret2026!",
                "role": "admin",
            },
        )
        assert admin_register_resp.status_code == 201
        admin_info = admin_register_resp.json()
        assert admin_info["email"] == "flight_director@nasa.gov"
        assert admin_info["role"] == "admin"
        assert "id" in admin_info

        # 2. Log in as admin and retrieve valid JWT
        admin_login_resp = await client.post(
            "/auth/token",
            data={
                "username": "flight_director@nasa.gov",
                "password": "DirectorSecret2026!",
            },
        )
        assert admin_login_resp.status_code == 200
        admin_token_data = admin_login_resp.json()
        assert "access_token" in admin_token_data
        assert admin_token_data["token_type"] == "bearer"
        admin_headers = {"Authorization": f"Bearer {admin_token_data['access_token']}"}

        # 3. Create a mission (Planned status)
        mission_payload = {
            "title": "Europa Surface Reconnaissance",
            "description": "Deep ice core telemetry survey",
            "status": "planned",
        }
        mission_create_resp = await client.post(
            "/missions",
            json=mission_payload,
            headers=admin_headers,
        )
        assert mission_create_resp.status_code == 201
        mission_info = mission_create_resp.json()
        mission_id = mission_info["id"]
        assert mission_info["title"] == "Europa Surface Reconnaissance"
        assert mission_info["status"] == "planned"

        # 4. Register team member and assign to mission
        member_register_resp = await client.post(
            "/auth/register",
            json={
                "email": "dr_stone@nasa.gov",
                "password": "AstroSecret2026!",
                "role": "team_member",
            },
        )
        assert member_register_resp.status_code == 201
        member_info = member_register_resp.json()
        member_id = member_info["id"]
        assert member_info["role"] == "team_member"

        assign_resp = await client.post(
            f"/missions/{mission_id}/assign",
            json={"user_ids": [member_id]},
            headers=admin_headers,
        )
        assert assign_resp.status_code == 200

        # 5. Log in as team member and submit weekly status report
        member_login_resp = await client.post(
            "/auth/token",
            data={
                "username": "dr_stone@nasa.gov",
                "password": "AstroSecret2026!",
            },
        )
        assert member_login_resp.status_code == 200
        member_token_data = member_login_resp.json()
        member_headers = {"Authorization": f"Bearer {member_token_data['access_token']}"}

        report_payload = {
            "current_status": "planned",
            "progress_update": "Cryogenic telemetry test completed successfully",
            "work_completed": "Validated spectrometer sensor calibrations",
            "blockers": None,
        }
        submit_report_resp = await client.post(
            f"/missions/{mission_id}/reports",
            json=report_payload,
            headers=member_headers,
        )
        assert submit_report_resp.status_code == 201
        report_info = submit_report_resp.json()
        report_id = report_info["id"]
        assert report_info["mission_id"] == mission_id
        assert report_info["reviewed"] is False

        # 6. Admin marks the report reviewed with comments
        review_payload = {
            "reviewed": True,
            "admin_comment": "Flight Director approval granted: Telemetry nominal.",
        }
        review_resp = await client.patch(
            f"/reports/{report_id}/review",
            json=review_payload,
            headers=admin_headers,
        )
        assert review_resp.status_code == 200
        reviewed_info = review_resp.json()
        assert reviewed_info["reviewed"] is True
        assert reviewed_info["admin_comment"] == "Flight Director approval granted: Telemetry nominal."

        # 7. Call GET /dashboard and verify derived metrics
        dashboard_resp = await client.get("/dashboard", headers=admin_headers)
        assert dashboard_resp.status_code == 200
        dashboard_data = dashboard_resp.json()

        # Assert exact metrics specified in acceptance criteria:
        # total_missions = 1, active_missions = 0 (planned), pending_reports = 0 (reviewed)
        assert dashboard_data["total_missions"] == 1
        assert dashboard_data["active_missions"] == 0
        assert dashboard_data["pending_reports"] == 0
        assert len(dashboard_data["recent_reports"]) == 1
        assert dashboard_data["recent_reports"][0]["id"] == report_id
        assert dashboard_data["recent_reports"][0]["reviewed"] is True
