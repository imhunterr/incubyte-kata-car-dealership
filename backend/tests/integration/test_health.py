"""Tests for the liveness/readiness endpoint, ``GET /api/health``."""

from collections.abc import Iterator

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.session import get_session

# Nothing listens on port 1, so connecting fails immediately.
UNREACHABLE_DATABASE_URL = "postgresql+psycopg://nobody:nothing@127.0.0.1:1/missing"


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_health_reports_database_reachable(client: TestClient) -> None:
    response = client.get("/api/health")

    assert response.json()["database"] == "ok"


def test_health_returns_503_when_database_is_unreachable(app: FastAPI, client: TestClient) -> None:
    def get_unreachable_session() -> Iterator[Session]:
        with Session(bind=create_engine(UNREACHABLE_DATABASE_URL)) as session:
            yield session

    app.dependency_overrides[get_session] = get_unreachable_session

    response = client.get("/api/health")

    assert response.status_code == 503
    assert response.json() == {"status": "unavailable", "database": "unreachable"}
