"""Tests for cross-origin (CORS) access to the API.

In development the SPA reaches the API through the Vite proxy (same origin),
so CORS is only needed when the frontend is served from another domain. Such
origins must be listed explicitly in ``CORS_ORIGINS``; nothing is allowed by
default.
"""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings, get_settings
from app.db.session import get_session
from app.main import create_app

ALLOWED_ORIGIN = "https://dealership.example.com"
OTHER_ORIGIN = "https://evil.example.net"


@pytest.fixture
def cors_client(session_factory: sessionmaker[Session]) -> Iterator[TestClient]:
    """A client for an app configured to allow exactly one extra origin."""

    def get_test_session() -> Iterator[Session]:
        with session_factory() as session:
            yield session

    app = create_app(Settings(cors_origins=[ALLOWED_ORIGIN]))
    app.dependency_overrides[get_session] = get_test_session
    with TestClient(app) as client:
        yield client


def _preflight(client: TestClient, origin: str) -> dict[str, str]:
    response = client.options(
        "/api/vehicles",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    return dict(response.headers)


def test_configured_origin_passes_the_preflight(cors_client: TestClient) -> None:
    headers = _preflight(cors_client, ALLOWED_ORIGIN)

    assert headers["access-control-allow-origin"] == ALLOWED_ORIGIN
    assert "authorization" in headers["access-control-allow-headers"].lower()


def test_configured_origin_gets_cors_headers_on_real_requests(cors_client: TestClient) -> None:
    response = cors_client.get("/api/health", headers={"Origin": ALLOWED_ORIGIN})

    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN


def test_unlisted_origin_is_not_allowed(cors_client: TestClient) -> None:
    headers = _preflight(cors_client, OTHER_ORIGIN)

    assert "access-control-allow-origin" not in headers


def test_no_cross_origin_access_by_default(client: TestClient) -> None:
    response = client.get("/api/health", headers={"Origin": ALLOWED_ORIGIN})

    assert "access-control-allow-origin" not in response.headers


def test_cors_origins_can_be_given_as_a_comma_separated_env_var(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("CORS_ORIGINS", "https://a.example.com, https://b.example.com")

    assert Settings().cors_origins == ["https://a.example.com", "https://b.example.com"]


def test_default_settings_allow_no_extra_origins() -> None:
    assert get_settings().cors_origins == []
