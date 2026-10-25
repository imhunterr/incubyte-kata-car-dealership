"""Tests for the authentication and authorisation guards on protected routes.

Authentication is exercised through ``GET /api/auth/me``. The admin guard is
exercised through a throwaway admin-only route that exists only in these tests,
so it can be verified before any real admin endpoint is built.
"""

from collections.abc import Callable
from datetime import timedelta

import jwt
import pytest
from fastapi import APIRouter, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import AdminUserDep
from app.core.roles import Role
from app.core.security import create_access_token
from app.models.user import User
from tests.helpers import auth_headers

ME_URL = "/api/auth/me"
ADMIN_ONLY_URL = "/api/test-only/admin"
NOT_AUTHENTICATED = "Could not validate credentials"


@pytest.fixture
def admin_only_route(app: FastAPI) -> None:
    """Mount a route guarded by the admin dependency on the test app."""
    router = APIRouter()

    @router.get(ADMIN_ONLY_URL)
    def admin_only(admin: AdminUserDep) -> dict[str, str]:
        return {"email": admin.email}

    app.include_router(router)


# --- Authentication (401) ---------------------------------------------------


def test_me_returns_the_authenticated_user(
    client: TestClient, create_user: Callable[..., User]
) -> None:
    user = create_user(email="alice@example.com")

    response = client.get(ME_URL, headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json() == {"id": user.id, "email": "alice@example.com", "role": "user"}


def test_missing_authorization_header_returns_401(client: TestClient) -> None:
    response = client.get(ME_URL)

    assert response.status_code == 401
    assert response.json()["detail"] == NOT_AUTHENTICATED
    assert response.headers["WWW-Authenticate"] == "Bearer"


@pytest.mark.parametrize(
    "header",
    ["Token abc.def.ghi", "Bearer", "Bearer ", "Basic dXNlcjpwYXNzd29yZA==", "abc.def.ghi"],
)
def test_malformed_authorization_header_returns_401(client: TestClient, header: str) -> None:
    response = client.get(ME_URL, headers={"Authorization": header})

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_token_signed_with_another_key_returns_401(
    client: TestClient, create_user: Callable[..., User]
) -> None:
    user = create_user()
    forged = jwt.encode(
        {"sub": str(user.id), "role": "admin", "exp": 4_102_444_800},  # year 2100
        "an-attacker-chosen-secret-key-that-is-long-enough",
        algorithm="HS256",
    )

    response = client.get(ME_URL, headers={"Authorization": f"Bearer {forged}"})

    assert response.status_code == 401


def test_expired_token_returns_401(client: TestClient, create_user: Callable[..., User]) -> None:
    user = create_user()
    expired = create_access_token(user_id=user.id, role=user.role, expires_in=timedelta(seconds=-1))

    response = client.get(ME_URL, headers={"Authorization": f"Bearer {expired}"})

    assert response.status_code == 401


def test_token_for_a_deleted_user_returns_401(
    client: TestClient, create_user: Callable[..., User], db_session: Session
) -> None:
    user = create_user()
    headers = auth_headers(user)
    db_session.delete(user)
    db_session.commit()

    response = client.get(ME_URL, headers=headers)

    assert response.status_code == 401


# --- Authorisation (403) ----------------------------------------------------


@pytest.mark.usefixtures("admin_only_route")
def test_admin_route_allows_an_admin(client: TestClient, create_user: Callable[..., User]) -> None:
    admin = create_user(email="admin@example.com", role=Role.ADMIN)

    response = client.get(ADMIN_ONLY_URL, headers=auth_headers(admin))

    assert response.status_code == 200
    assert response.json() == {"email": "admin@example.com"}


@pytest.mark.usefixtures("admin_only_route")
def test_admin_route_rejects_a_regular_user_with_403(
    client: TestClient, create_user: Callable[..., User]
) -> None:
    user = create_user(role=Role.USER)

    response = client.get(ADMIN_ONLY_URL, headers=auth_headers(user))

    assert response.status_code == 403
    assert response.json()["detail"] == "Admin privileges required"


@pytest.mark.usefixtures("admin_only_route")
def test_admin_route_rejects_an_anonymous_caller_with_401(client: TestClient) -> None:
    response = client.get(ADMIN_ONLY_URL)

    assert response.status_code == 401


@pytest.mark.usefixtures("admin_only_route")
def test_admin_route_uses_the_current_role_not_the_role_in_the_token(
    client: TestClient, create_user: Callable[..., User], db_session: Session
) -> None:
    # An admin is demoted after logging in; their still-valid token says
    # "admin", but the database is the source of truth.
    admin = create_user(role=Role.ADMIN)
    headers = auth_headers(admin)
    admin.role = Role.USER
    db_session.commit()

    response = client.get(ADMIN_ONLY_URL, headers=headers)

    assert response.status_code == 403
