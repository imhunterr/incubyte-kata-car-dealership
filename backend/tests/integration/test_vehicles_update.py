"""Tests for updating a vehicle, ``PUT /api/vehicles/{id}`` (admin only).

``PUT`` replaces every editable field, so the body must be complete.
"""

from collections.abc import Callable
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.categories import FuelType, VehicleCategory
from app.models.vehicle import Vehicle
from tests.helpers import vehicle_url

UPDATED_VEHICLE = {
    "make": "Toyota",
    "model": "Corolla Hybrid",
    "category": "hatchback",
    "price": "24999.00",
    "quantity": 7,
    "year": 2023,
    "fuel_type": "hybrid",
    "transmission": "automatic",
    "mileage_km": 4200,
}


def test_admin_updates_a_vehicle_and_gets_it_back(
    client: TestClient, admin_headers: dict[str, str], create_vehicle: Callable[..., Vehicle]
) -> None:
    vehicle = create_vehicle()

    response = client.put(vehicle_url(vehicle.id), json=UPDATED_VEHICLE, headers=admin_headers)

    assert response.status_code == 200
    assert response.json() == {"id": vehicle.id, **UPDATED_VEHICLE}


def test_update_is_persisted(
    client: TestClient,
    admin_headers: dict[str, str],
    create_vehicle: Callable[..., Vehicle],
    db_session: Session,
) -> None:
    vehicle = create_vehicle()

    client.put(vehicle_url(vehicle.id), json=UPDATED_VEHICLE, headers=admin_headers)

    db_session.refresh(vehicle)
    assert vehicle.model == "Corolla Hybrid"
    assert vehicle.category is VehicleCategory.HATCHBACK
    assert vehicle.price == Decimal("24999.00")
    assert vehicle.quantity == 7
    assert vehicle.year == 2023
    assert vehicle.fuel_type is FuelType.HYBRID
    assert vehicle.mileage_km == 4200


def test_update_leaves_other_vehicles_untouched(
    client: TestClient,
    admin_headers: dict[str, str],
    create_vehicle: Callable[..., Vehicle],
    db_session: Session,
) -> None:
    target = create_vehicle(model="Corolla")
    bystander = create_vehicle(make="Honda", model="Civic")

    client.put(vehicle_url(target.id), json=UPDATED_VEHICLE, headers=admin_headers)

    db_session.refresh(bystander)
    assert (bystander.make, bystander.model) == ("Honda", "Civic")


def test_updating_an_unknown_vehicle_returns_404(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    response = client.put(vehicle_url(999_999), json=UPDATED_VEHICLE, headers=admin_headers)

    assert response.status_code == 404
    assert response.json()["detail"] == "Vehicle not found"


def test_non_numeric_id_returns_422(client: TestClient, admin_headers: dict[str, str]) -> None:
    response = client.put(vehicle_url("abc"), json=UPDATED_VEHICLE, headers=admin_headers)

    assert response.status_code == 422


@pytest.mark.parametrize(
    "overrides",
    [
        {"price": "0"},
        {"price": "10.001"},
        {"quantity": -1},
        {"make": "   "},
        {"category": "spaceship"},
        {"year": 1900},
        {"fuel_type": "steam"},
        {"transmission": "cvt"},
        {"mileage_km": -5},
    ],
    ids=[
        "zero-price",
        "3-decimals",
        "negative-quantity",
        "blank-make",
        "unknown-category",
        "ancient-year",
        "unknown-fuel",
        "unknown-transmission",
        "negative-mileage",
    ],
)
def test_update_applies_the_same_validation_as_create(
    client: TestClient,
    admin_headers: dict[str, str],
    create_vehicle: Callable[..., Vehicle],
    overrides: dict[str, object],
) -> None:
    vehicle = create_vehicle()

    response = client.put(
        vehicle_url(vehicle.id), json={**UPDATED_VEHICLE, **overrides}, headers=admin_headers
    )

    assert response.status_code == 422


def test_partial_body_is_rejected_because_put_replaces_everything(
    client: TestClient, admin_headers: dict[str, str], create_vehicle: Callable[..., Vehicle]
) -> None:
    vehicle = create_vehicle()

    response = client.put(vehicle_url(vehicle.id), json={"price": "1000.00"}, headers=admin_headers)

    assert response.status_code == 422


def test_regular_user_cannot_update_a_vehicle(
    client: TestClient, user_headers: dict[str, str], create_vehicle: Callable[..., Vehicle]
) -> None:
    vehicle = create_vehicle()

    response = client.put(vehicle_url(vehicle.id), json=UPDATED_VEHICLE, headers=user_headers)

    assert response.status_code == 403


def test_anonymous_caller_cannot_update_a_vehicle(
    client: TestClient, create_vehicle: Callable[..., Vehicle]
) -> None:
    vehicle = create_vehicle()

    response = client.put(vehicle_url(vehicle.id), json=UPDATED_VEHICLE)

    assert response.status_code == 401
