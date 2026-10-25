"""Tests for restocking, ``POST /api/vehicles/{id}/restock`` (admin only).

Body: ``{"quantity": n}`` — the number of units to add (1 to 10,000).
"""

from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle
from tests.helpers import vehicle_url


def _restock_url(vehicle_id: int) -> str:
    return vehicle_url(vehicle_id, "restock")


def test_restock_adds_units_and_returns_the_vehicle(
    client: TestClient, admin_headers: dict[str, str], create_vehicle: Callable[..., Vehicle]
) -> None:
    vehicle = create_vehicle(quantity=2)

    response = client.post(_restock_url(vehicle.id), json={"quantity": 5}, headers=admin_headers)

    assert response.status_code == 200
    assert response.json()["id"] == vehicle.id
    assert response.json()["quantity"] == 7


def test_restock_is_persisted(
    client: TestClient,
    admin_headers: dict[str, str],
    create_vehicle: Callable[..., Vehicle],
    db_session: Session,
) -> None:
    vehicle = create_vehicle(quantity=2)

    client.post(_restock_url(vehicle.id), json={"quantity": 5}, headers=admin_headers)

    db_session.refresh(vehicle)
    assert vehicle.quantity == 7


def test_restocking_a_sold_out_vehicle_makes_it_purchasable_again(
    client: TestClient,
    admin_headers: dict[str, str],
    user_headers: dict[str, str],
    create_vehicle: Callable[..., Vehicle],
) -> None:
    vehicle = create_vehicle(quantity=0)

    client.post(_restock_url(vehicle.id), json={"quantity": 1}, headers=admin_headers)
    purchase = client.post(vehicle_url(vehicle.id, "purchase"), headers=user_headers)

    assert purchase.status_code == 200
    assert purchase.json()["quantity"] == 0


def test_restock_accepts_the_maximum_of_10000_units(
    client: TestClient, admin_headers: dict[str, str], create_vehicle: Callable[..., Vehicle]
) -> None:
    vehicle = create_vehicle(quantity=0)

    response = client.post(
        _restock_url(vehicle.id), json={"quantity": 10_000}, headers=admin_headers
    )

    assert response.status_code == 200
    assert response.json()["quantity"] == 10_000


@pytest.mark.parametrize(
    "body",
    [
        {"quantity": 0},
        {"quantity": -1},
        {"quantity": 10_001},
        {"quantity": 2.5},
        {"quantity": "3"},
        {"quantity": True},
        {"quantity": None},
        {},
    ],
    ids=["zero", "negative", "over-max", "fraction", "string", "bool", "null", "missing"],
)
def test_invalid_restock_quantity_is_rejected_and_stock_is_unchanged(
    client: TestClient,
    admin_headers: dict[str, str],
    create_vehicle: Callable[..., Vehicle],
    db_session: Session,
    body: dict[str, object],
) -> None:
    vehicle = create_vehicle(quantity=2)

    response = client.post(_restock_url(vehicle.id), json=body, headers=admin_headers)

    assert response.status_code == 422
    db_session.refresh(vehicle)
    assert vehicle.quantity == 2


def test_restocking_an_unknown_vehicle_returns_404(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    response = client.post(_restock_url(999_999), json={"quantity": 1}, headers=admin_headers)

    assert response.status_code == 404
    assert response.json()["detail"] == "Vehicle not found"


def test_regular_user_cannot_restock(
    client: TestClient,
    user_headers: dict[str, str],
    create_vehicle: Callable[..., Vehicle],
    db_session: Session,
) -> None:
    vehicle = create_vehicle(quantity=2)

    response = client.post(_restock_url(vehicle.id), json={"quantity": 5}, headers=user_headers)

    assert response.status_code == 403
    db_session.refresh(vehicle)
    assert vehicle.quantity == 2


def test_anonymous_caller_cannot_restock(
    client: TestClient, create_vehicle: Callable[..., Vehicle]
) -> None:
    vehicle = create_vehicle(quantity=2)

    response = client.post(_restock_url(vehicle.id), json={"quantity": 5})

    assert response.status_code == 401
