"""Tests for Issue #2: Database Models and Migrations Setup."""
import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from app.models.base import Base
import app.models  # noqa: F401 - register all models


@pytest.fixture
def in_memory_session():
    """Create an in-memory SQLite session with all tables created."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    engine.dispose()


def test_all_four_tables_exist(in_memory_session):
    """All four tables (users, missions, reports, mission_assignments) must exist."""
    engine = in_memory_session.get_bind()
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    assert "users" in tables
    assert "missions" in tables
    assert "reports" in tables
    assert "mission_assignments" in tables


def test_user_model_columns(in_memory_session):
    """User model has the required columns."""
    engine = in_memory_session.get_bind()
    inspector = inspect(engine)
    cols = {c["name"] for c in inspector.get_columns("users")}
    assert {"id", "email", "hashed_password", "role", "created_at"}.issubset(cols)


def test_mission_model_columns(in_memory_session):
    """Mission model has the required columns."""
    engine = in_memory_session.get_bind()
    inspector = inspect(engine)
    cols = {c["name"] for c in inspector.get_columns("missions")}
    assert {"id", "title", "description", "status", "created_at"}.issubset(cols)


def test_report_model_columns(in_memory_session):
    """Report model has the required columns."""
    engine = in_memory_session.get_bind()
    inspector = inspect(engine)
    cols = {c["name"] for c in inspector.get_columns("reports")}
    required = {
        "id", "mission_id", "user_id", "current_status", "progress_update",
        "work_completed", "blockers", "reviewed", "admin_comment", "submitted_at",
    }
    assert required.issubset(cols)


def test_mission_assignments_join_table(in_memory_session):
    """mission_assignments table has user_id and mission_id columns."""
    engine = in_memory_session.get_bind()
    inspector = inspect(engine)
    cols = {c["name"] for c in inspector.get_columns("mission_assignments")}
    assert {"user_id", "mission_id"}.issubset(cols)


def test_no_raw_sql_in_model_files():
    """Model files must not contain raw SQL strings (i.e. text() calls or raw DDL)."""
    import ast
    import pathlib

    models_dir = pathlib.Path(__file__).parent.parent / "app" / "models"
    violations = []
    for py_file in models_dir.glob("*.py"):
        source = py_file.read_text()
        # text() is the SQLAlchemy helper for raw SQL - flag its use in models
        if 'text("' in source or "text('" in source:
            violations.append(py_file.name)
    assert violations == [], f"Raw SQL found in model files: {violations}"
