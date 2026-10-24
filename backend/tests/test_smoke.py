"""Smoke test - verifies the app starts and the health endpoint responds.

This test imports NO business-logic module (no models, no routes).
"""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
