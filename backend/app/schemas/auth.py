"""Request and response bodies for the authentication endpoints."""

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.roles import Role

PASSWORD_MIN_LENGTH = 8
# The upper bound stops a single request from forcing an expensive hash of an
# arbitrarily large input.
PASSWORD_MAX_LENGTH = 128


class RegisterRequest(BaseModel):
    """Body of ``POST /api/auth/register``.

    There is intentionally no ``role`` field: any role sent by a client is
    ignored, so nobody can register themselves as an admin.
    """

    email: EmailStr
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)


class UserRead(BaseModel):
    """Public view of a user. Deliberately has no password field."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: Role


class LoginRequest(BaseModel):
    """Body of ``POST /api/auth/login``.

    The e-mail is not format-validated here: a malformed address simply fails
    to match an account and gets the same 401 as any other bad credentials.
    """

    email: str
    password: str


class TokenResponse(BaseModel):
    """Successful login: a bearer token plus the authenticated user."""

    access_token: str
    token_type: str = "bearer"
    user: UserRead
