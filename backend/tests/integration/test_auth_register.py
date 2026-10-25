"""Tests for user registration, ``POST /api/auth/register``."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.models.user import User

REGISTER_URL = "/api/auth/register"


def test_register_returns_201_with_the_new_user(client: TestClient) -> None:
    response = client.post(
        REGISTER_URL, json={"email": "alice@example.com", "password": "correct-horse"}
    )

    assert response.status_code == 201
    body = response.json()
    assert isinstance(body["id"], int)
    assert body["email"] == "alice@example.com"
    assert body["role"] == "user"


def test_register_response_never_exposes_the_password(client: TestClient) -> None:
    response = client.post(
        REGISTER_URL, json={"email": "alice@example.com", "password": "correct-horse"}
    )

    assert set(response.json()) == {"id", "email", "role"}
    assert "correct-horse" not in response.text


def test_register_stores_only_a_password_hash(client: TestClient, db_session: Session) -> None:
    client.post(REGISTER_URL, json={"email": "alice@example.com", "password": "correct-horse"})

    user = db_session.scalars(select(User).where(User.email == "alice@example.com")).one()
    assert user.password_hash != "correct-horse"
    assert verify_password("correct-horse", user.password_hash)


def test_register_rejects_a_duplicate_email_with_409(client: TestClient) -> None:
    credentials = {"email": "alice@example.com", "password": "correct-horse"}
    client.post(REGISTER_URL, json=credentials)

    response = client.post(REGISTER_URL, json=credentials)

    assert response.status_code == 409
    assert response.json()["detail"] == "Email is already registered"


def test_register_treats_emails_differing_only_in_case_as_duplicates(client: TestClient) -> None:
    client.post(REGISTER_URL, json={"email": "alice@example.com", "password": "correct-horse"})

    response = client.post(
        REGISTER_URL, json={"email": "Alice@Example.COM", "password": "another-password"}
    )

    assert response.status_code == 409


def test_register_stores_the_email_in_lower_case(client: TestClient) -> None:
    response = client.post(
        REGISTER_URL, json={"email": "Alice@Example.COM", "password": "correct-horse"}
    )

    assert response.json()["email"] == "alice@example.com"


@pytest.mark.parametrize(
    "email", ["", "not-an-email", "missing-at.example.com", "alice@", "@example.com"]
)
def test_register_rejects_an_invalid_email_with_422(client: TestClient, email: str) -> None:
    response = client.post(REGISTER_URL, json={"email": email, "password": "correct-horse"})

    assert response.status_code == 422


def test_register_rejects_a_password_shorter_than_8_characters(client: TestClient) -> None:
    response = client.post(REGISTER_URL, json={"email": "alice@example.com", "password": "short12"})

    assert response.status_code == 422


def test_register_accepts_a_password_of_exactly_8_characters(client: TestClient) -> None:
    response = client.post(
        REGISTER_URL, json={"email": "alice@example.com", "password": "exactly8"}
    )

    assert response.status_code == 201


def test_register_rejects_a_password_longer_than_128_characters(client: TestClient) -> None:
    # An upper bound keeps a single request from forcing an expensive hash of
    # an arbitrarily large input.
    response = client.post(REGISTER_URL, json={"email": "alice@example.com", "password": "x" * 129})

    assert response.status_code == 422


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"email": "alice@example.com"},
        {"password": "correct-horse"},
    ],
    ids=["empty", "missing-password", "missing-email"],
)
def test_register_rejects_missing_fields_with_422(client: TestClient, body: dict[str, str]) -> None:
    response = client.post(REGISTER_URL, json=body)

    assert response.status_code == 422


def test_register_ignores_a_role_sent_by_the_client(client: TestClient) -> None:
    response = client.post(
        REGISTER_URL,
        json={"email": "mallory@example.com", "password": "correct-horse", "role": "admin"},
    )

    assert response.status_code == 201
    assert response.json()["role"] == "user"
