# app/models/__init__.py
# Import all models here so Alembic can discover them via autogenerate.
from app.models.base import Base  # noqa: F401
from app.models.user import User, mission_assignments  # noqa: F401
from app.models.mission import Mission  # noqa: F401
from app.models.report import Report  # noqa: F401
