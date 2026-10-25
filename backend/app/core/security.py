"""Security primitives: password hashing and JWT access tokens.

Passwords are hashed with Argon2 (via ``pwdlib``), the winner of the Password
Hashing Competition and the current OWASP recommendation. Each hash embeds its
own random salt and cost parameters, so only the hash string needs storing.

Access tokens are JWTs signed with HMAC-SHA256 using ``JWT_SECRET_KEY``. They
carry the user id (``sub``), the user's role, and issue/expiry times.
"""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings
from app.core.roles import Role

_password_hasher = PasswordHash.recommended()

_REQUIRED_CLAIMS = ["sub", "role", "exp"]


class InvalidTokenError(Exception):
    """The access token is malformed, wrongly signed, expired or incomplete."""


@dataclass(frozen=True, slots=True)
class AccessTokenClaims:
    """The validated contents of an access token."""

    user_id: int
    role: Role
    expires_at: datetime


def hash_password(password: str) -> str:
    """Return a salted Argon2 hash of ``password``, safe to store."""
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Return ``True`` if ``password`` matches the stored ``password_hash``."""
    return _password_hasher.verify(password, password_hash)


def create_access_token(*, user_id: int, role: Role, expires_in: timedelta | None = None) -> str:
    """Issue a signed access token for a user.

    Args:
        user_id: Id of the authenticated user; stored as the ``sub`` claim.
        role: The user's role at the time of issue.
        expires_in: Token lifetime. Defaults to ``ACCESS_TOKEN_EXPIRE_MINUTES``.
    """
    settings = get_settings()
    if expires_in is None:
        expires_in = timedelta(minutes=settings.access_token_expire_minutes)

    issued_at = datetime.now(UTC)
    payload = {
        # JWT requires "sub" to be a string.
        "sub": str(user_id),
        "role": role.value,
        "iat": issued_at,
        "exp": issued_at + expires_in,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> AccessTokenClaims:
    """Validate an access token and return its claims.

    The signature, the expiry and the presence of every required claim are
    checked. Only the configured algorithm is accepted, which rules out
    unsigned (``alg: none``) and algorithm-confusion attacks.

    Raises:
        InvalidTokenError: If the token fails any check.
    """
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"require": _REQUIRED_CLAIMS},
        )
        return AccessTokenClaims(
            user_id=int(payload["sub"]),
            role=Role(payload["role"]),
            expires_at=datetime.fromtimestamp(payload["exp"], tz=UTC),
        )
    except (jwt.PyJWTError, ValueError) as error:
        # ValueError covers a non-numeric "sub" and an unknown "role".
        raise InvalidTokenError(str(error)) from error
