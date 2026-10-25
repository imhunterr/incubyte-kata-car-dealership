"""SQLAlchemy ORM models.

Every model module must be imported here so that importing ``app.models``
registers all tables on ``Base.metadata`` (Alembic relies on this).
"""

from app.models.user import User
from app.models.vehicle import Vehicle

__all__ = ["User", "Vehicle"]
