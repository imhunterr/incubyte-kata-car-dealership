"""Small helpers shared by test modules."""

from app.core.security import create_access_token
from app.models.user import User


def auth_headers(user: User) -> dict[str, str]:
    """``Authorization`` header carrying a freshly issued token for ``user``."""
    token = create_access_token(user_id=user.id, role=user.role)
    return {"Authorization": f"Bearer {token}"}
