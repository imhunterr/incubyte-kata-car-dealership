"""Tests for logging in, ``POST /api/auth/login``."""

from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

from app.core.roles import Role
from app.core.security import decode_access_token
from app.models.user import User
from tests.conftest import DEFAULT_PASSWORD

LOGIN_URL = "/api/auth/login"
INVALID_CREDENTIALS = "Invalid email or password"


def test_login_with_correct_credentials_returns_a_bearer_token_and_the_user(
    client: TestClient, create_user: Callable[..., User]
) -> None:
    user = create_user(email="alice@example.com")

    response = client.post(
        LOGIN_URL, json={"email": "alice@example.com", "password": DEFAULT_PASSWORD}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str)
    assert body["user"] == {"id": user.id, "email": "alice@example.com", "role": "user"}


@pytest.mark.parametrize("role", [Role.USER, Role.ADMIN])
def test_login_token_identifies_the_user_and_their_role(
    client: TestClient, create_user: Callable[..., User], role: Role
) -> None:
    user = create_user(email="alice@example.com", role=role)

    response = client.post(
        LOGIN_URL, json={"email": "alice@example.com", "password": DEFAULT_PASSWORD}
    )

    claims = decode_access_token(response.json()["access_token"])
    assert claims.user_id == user.id
    assert claims.role is role


def test_login_matches_the_email_case_insensitively(
    client: TestClient, create_user: Callable[..., User]
) -> None:
    create_user(email="alice@example.com")

    response = client.post(
        LOGIN_URL, json={"email": "Alice@Example.COM", "password": DEFAULT_PASSWORD}
    )

    assert response.status_code == 200


def test_login_with_a_wrong_password_returns_401(
    client: TestClient, create_user: Callable[..., User]
) -> None:
    create_user(email="alice@example.com")

    response = client.post(
        LOGIN_URL, json={"email": "alice@example.com", "password": "wrong-password"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == INVALID_CREDENTIALS
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_login_with_an_unknown_email_gives_the_same_401_as_a_wrong_password(
    client: TestClient,
) -> None:
    # Identical responses mean the endpoint cannot be used to discover which
    # e-mail addresses have accounts.
    response = client.post(
        LOGIN_URL, json={"email": "nobody@example.com", "password": DEFAULT_PASSWORD}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == INVALID_CREDENTIALS


def test_login_password_is_case_sensitive(
    client: TestClient, create_user: Callable[..., User]
) -> None:
    create_user(email="alice@example.com", password="Correct-Horse")

    response = client.post(
        LOGIN_URL, json={"email": "alice@example.com", "password": "correct-horse"}
    )

    assert response.status_code == 401


@pytest.mark.parametrize(
    "body",
    [{}, {"email": "alice@example.com"}, {"password": DEFAULT_PASSWORD}],
    ids=["empty", "missing-password", "missing-email"],
)
def test_login_rejects_missing_fields_with_422(client: TestClient, body: dict[str, str]) -> None:
    response = client.post(LOGIN_URL, json=body)

    assert response.status_code == 422
