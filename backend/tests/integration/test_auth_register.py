"""Tests for user registration, ``POST /api/auth/register``."""

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
