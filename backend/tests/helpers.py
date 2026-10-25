"""Small helpers shared by test modules."""

from app.core.security import create_access_token
from app.models.user import User

VEHICLES_URL = "/api/vehicles"

DEFAULT_PASSWORD = "correct-horse"
"""Password given to users made by the ``create_user`` fixture unless overridden."""


def auth_headers(user: User) -> dict[str, str]:
    """``Authorization`` header carrying a freshly issued token for ``user``."""
    token = create_access_token(user_id=user.id, role=user.role)
    return {"Authorization": f"Bearer {token}"}


def vehicle_url(vehicle_id: int | str) -> str:
    """URL of a single vehicle."""
    return f"{VEHICLES_URL}/{vehicle_id}"
