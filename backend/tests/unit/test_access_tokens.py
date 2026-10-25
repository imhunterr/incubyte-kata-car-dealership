"""Unit tests for JWT access tokens in ``app.core.security``."""

from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.core.config import get_settings
from app.core.roles import Role
from app.core.security import InvalidTokenError, create_access_token, decode_access_token

OTHER_SECRET = "a-completely-different-secret-key-of-32+-bytes"


def _encode(claims: dict[str, object], key: str | None = None, algorithm: str = "HS256") -> str:
    """Sign arbitrary claims, to build tokens the application would never issue."""
    return jwt.encode(claims, key or get_settings().jwt_secret_key, algorithm=algorithm)


def _future() -> datetime:
    return datetime.now(UTC) + timedelta(minutes=5)


def test_round_trip_preserves_user_id_and_role() -> None:
    token = create_access_token(user_id=42, role=Role.ADMIN)

    claims = decode_access_token(token)

    assert claims.user_id == 42
    assert claims.role is Role.ADMIN


def test_token_expires_after_the_configured_lifetime() -> None:
    lifetime = timedelta(minutes=get_settings().access_token_expire_minutes)

    claims = decode_access_token(create_access_token(user_id=1, role=Role.USER))

    expected_expiry = datetime.now(UTC) + lifetime
    assert abs(claims.expires_at - expected_expiry) < timedelta(seconds=5)


def test_custom_lifetime_is_respected() -> None:
    claims = decode_access_token(
        create_access_token(user_id=1, role=Role.USER, expires_in=timedelta(minutes=2))
    )

    expected_expiry = datetime.now(UTC) + timedelta(minutes=2)
    assert abs(claims.expires_at - expected_expiry) < timedelta(seconds=5)


def test_expired_token_is_rejected() -> None:
    token = create_access_token(user_id=1, role=Role.USER, expires_in=timedelta(seconds=-1))

    with pytest.raises(InvalidTokenError):
        decode_access_token(token)


def test_token_signed_with_another_key_is_rejected() -> None:
    token = _encode({"sub": "1", "role": "user", "exp": _future()}, key=OTHER_SECRET)

    with pytest.raises(InvalidTokenError):
        decode_access_token(token)


def test_unsigned_token_is_rejected() -> None:
    # The classic "alg: none" attack: a token with no signature at all.
    token = jwt.encode({"sub": "1", "role": "admin", "exp": _future()}, key=None, algorithm="none")

    with pytest.raises(InvalidTokenError):
        decode_access_token(token)


@pytest.mark.parametrize("garbage", ["", "not-a-jwt", "a.b.c"])
def test_malformed_token_is_rejected(garbage: str) -> None:
    with pytest.raises(InvalidTokenError):
        decode_access_token(garbage)


@pytest.mark.parametrize("missing_claim", ["sub", "role", "exp"])
def test_token_missing_a_required_claim_is_rejected(missing_claim: str) -> None:
    claims: dict[str, object] = {"sub": "1", "role": "user", "exp": _future()}
    del claims[missing_claim]

    with pytest.raises(InvalidTokenError):
        decode_access_token(_encode(claims))


def test_token_with_unknown_role_is_rejected() -> None:
    token = _encode({"sub": "1", "role": "superuser", "exp": _future()})

    with pytest.raises(InvalidTokenError):
        decode_access_token(token)


def test_token_with_non_numeric_subject_is_rejected() -> None:
    token = _encode({"sub": "alice", "role": "user", "exp": _future()})

    with pytest.raises(InvalidTokenError):
        decode_access_token(token)
