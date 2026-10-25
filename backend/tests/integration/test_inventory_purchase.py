"""Tests for buying a vehicle, ``POST /api/vehicles/{id}/purchase`` (any user).

A purchase takes exactly one unit out of stock.
"""

from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle
from tests.helpers import vehicle_url


def _purchase_url(vehicle_id: int) -> str:
    return vehicle_url(vehicle_id, "purchase")


def test_purchase_decreases_stock_by_one_and_returns_the_vehicle(
    client: TestClient, user_headers: dict[str, str], create_vehicle: Callable[..., Vehicle]
) -> None:
    vehicle = create_vehicle(quantity=3)

    response = client.post(_purchase_url(vehicle.id), headers=user_headers)

    assert response.status_code == 200
    assert response.json()["id"] == vehicle.id
    assert response.json()["quantity"] == 2


def test_purchase_is_persisted(
    client: TestClient,
    user_headers: dict[str, str],
    create_vehicle: Callable[..., Vehicle],
    db_session: Session,
) -> None:
    vehicle = create_vehicle(quantity=3)

    client.post(_purchase_url(vehicle.id), headers=user_headers)

    db_session.refresh(vehicle)
    assert vehicle.quantity == 2


def test_buying_the_last_unit_leaves_zero_in_stock(
    client: TestClient, user_headers: dict[str, str], create_vehicle: Callable[..., Vehicle]
) -> None:
    vehicle = create_vehicle(quantity=1)

    response = client.post(_purchase_url(vehicle.id), headers=user_headers)

    assert response.status_code == 200
    assert response.json()["quantity"] == 0


def test_purchasing_an_out_of_stock_vehicle_returns_409_and_keeps_stock_at_zero(
    client: TestClient,
    user_headers: dict[str, str],
    create_vehicle: Callable[..., Vehicle],
    db_session: Session,
) -> None:
    vehicle = create_vehicle(quantity=0)

    response = client.post(_purchase_url(vehicle.id), headers=user_headers)

    assert response.status_code == 409
    assert response.json()["detail"] == "Vehicle is out of stock"
    db_session.refresh(vehicle)
    assert vehicle.quantity == 0


def test_repeated_purchases_stop_at_zero(
    client: TestClient, user_headers: dict[str, str], create_vehicle: Callable[..., Vehicle]
) -> None:
    vehicle = create_vehicle(quantity=2)

    statuses = [
        client.post(_purchase_url(vehicle.id), headers=user_headers).status_code for _ in range(3)
    ]

    assert statuses == [200, 200, 409]


def test_purchasing_an_unknown_vehicle_returns_404(
    client: TestClient, user_headers: dict[str, str]
) -> None:
    response = client.post(_purchase_url(999_999), headers=user_headers)

    assert response.status_code == 404
    assert response.json()["detail"] == "Vehicle not found"


@pytest.mark.parametrize("headers_fixture", ["user_headers", "admin_headers"])
def test_any_authenticated_user_can_purchase(
    client: TestClient,
    create_vehicle: Callable[..., Vehicle],
    request: pytest.FixtureRequest,
    headers_fixture: str,
) -> None:
    vehicle = create_vehicle(quantity=1)
    headers: dict[str, str] = request.getfixturevalue(headers_fixture)

    response = client.post(_purchase_url(vehicle.id), headers=headers)

    assert response.status_code == 200


def test_anonymous_caller_cannot_purchase(
    client: TestClient, create_vehicle: Callable[..., Vehicle], db_session: Session
) -> None:
    vehicle = create_vehicle(quantity=1)

    response = client.post(_purchase_url(vehicle.id))

    assert response.status_code == 401
    db_session.refresh(vehicle)
    assert vehicle.quantity == 1
