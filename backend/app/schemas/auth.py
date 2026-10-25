"""Request and response bodies for the authentication endpoints."""

from pydantic import BaseModel, ConfigDict

from app.core.roles import Role


class RegisterRequest(BaseModel):
    """Body of ``POST /api/auth/register``."""

    email: str
    password: str


class UserRead(BaseModel):
    """Public view of a user. Deliberately has no password field."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: Role
