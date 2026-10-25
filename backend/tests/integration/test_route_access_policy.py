"""The access policy of every API operation, checked in one place.

Operations are discovered from the OpenAPI schema (the public contract), then
called for real:

- anonymously: everything except the explicitly public operations must 401;
- as a regular user: exactly the admin operations must 403.

A new endpoint that forgets its guard therefore fails this test, even if
nobody remembered to write a dedicated auth test for it.
"""

import re

import pytest
from fastapi.testclient import TestClient

from app.main import create_app

PUBLIC = {
    ("GET", "/api/health"),
    ("POST", "/api/auth/register"),
    ("POST", "/api/auth/login"),
}
ADMIN_ONLY = {
    ("POST", "/api/vehicles"),
    ("PUT", "/api/vehicles/{vehicle_id}"),
    ("DELETE", "/api/vehicles/{vehicle_id}"),
    ("POST", "/api/vehicles/{vehicle_id}/restock"),
}

OPERATIONS = sorted(
    (method.upper(), path)
    for path, operations in create_app().openapi()["paths"].items()
    for method in operations
)


def _call(client: TestClient, method: str, path: str, headers: dict[str, str]) -> int:
    concrete_path = re.sub(r"\{[^}]+\}", "1", path)
    return client.request(method, concrete_path, json={}, headers=headers).status_code


def test_policy_only_lists_operations_that_exist() -> None:
    assert (PUBLIC | ADMIN_ONLY).issubset(OPERATIONS)


@pytest.mark.parametrize(("method", "path"), OPERATIONS, ids=[f"{m} {p}" for m, p in OPERATIONS])
def test_operation_requires_authentication_unless_public(
    client: TestClient, method: str, path: str
) -> None:
    status_code = _call(client, method, path, headers={})

    if (method, path) in PUBLIC:
        assert status_code != 401
    else:
        assert status_code == 401


@pytest.mark.parametrize(("method", "path"), OPERATIONS, ids=[f"{m} {p}" for m, p in OPERATIONS])
def test_exactly_the_admin_operations_forbid_regular_users(
    client: TestClient, user_headers: dict[str, str], method: str, path: str
) -> None:
    status_code = _call(client, method, path, headers=user_headers)

    if (method, path) in ADMIN_ONLY:
        assert status_code == 403
    else:
        assert status_code != 403
