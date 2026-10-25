"""Shared pytest fixtures for the API test suite."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client() -> Iterator[TestClient]:
    """An HTTP client bound to a fresh application instance."""
    with TestClient(create_app()) as test_client:
        yield test_client
