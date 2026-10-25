"""Tests for adding a vehicle, ``POST /api/vehicles`` (admin only)."""

from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.categories import VehicleCategory
from app.models.vehicle import Vehicle

VEHICLES_URL = "/api/vehicles"

VALID_VEHICLE = {
    "make": "Toyota",
    "model": "Corolla",
    "category": "sedan",
    "price": "21999.99",
    "quantity": 4,
}


def test_admin_creates_a_vehicle_and_gets_201_with_its_id(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    response = client.post(VEHICLES_URL, json=VALID_VEHICLE, headers=admin_headers)

    assert response.status_code == 201
    body = response.json()
    assert isinstance(body["id"], int)
    assert body == {"id": body["id"], **VALID_VEHICLE}


def test_created_vehicle_is_persisted(
    client: TestClient, admin_headers: dict[str, str], db_session: Session
) -> None:
    vehicle_id = client.post(VEHICLES_URL, json=VALID_VEHICLE, headers=admin_headers).json()["id"]

    vehicle = db_session.scalars(select(Vehicle).where(Vehicle.id == vehicle_id)).one()
    assert vehicle.make == "Toyota"
    assert vehicle.model == "Corolla"
    assert vehicle.category is VehicleCategory.SEDAN
    assert vehicle.price == Decimal("21999.99")
    assert vehicle.quantity == 4


def test_price_may_be_sent_as_a_json_number(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    response = client.post(
        VEHICLES_URL, json={**VALID_VEHICLE, "price": 18500.5}, headers=admin_headers
    )

    assert response.status_code == 201
    assert response.json()["price"] == "18500.50"


def test_regular_user_cannot_create_a_vehicle(
    client: TestClient, user_headers: dict[str, str]
) -> None:
    response = client.post(VEHICLES_URL, json=VALID_VEHICLE, headers=user_headers)

    assert response.status_code == 403


def test_anonymous_caller_cannot_create_a_vehicle(client: TestClient) -> None:
    response = client.post(VEHICLES_URL, json=VALID_VEHICLE)

    assert response.status_code == 401
