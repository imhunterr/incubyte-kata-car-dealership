"""Tests for adding a vehicle, ``POST /api/vehicles`` (admin only)."""

from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.categories import FuelType, Transmission, VehicleCategory
from app.models.vehicle import Vehicle
from tests.helpers import VEHICLES_URL

VALID_VEHICLE = {
    "make": "Toyota",
    "model": "Corolla",
    "category": "sedan",
    "price": "21999.99",
    "quantity": 4,
    "year": 2022,
    "fuel_type": "petrol",
    "transmission": "automatic",
    "mileage_km": 15000,
}

NEXT_YEAR = date.today().year + 1


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
    assert vehicle.year == 2022
    assert vehicle.fuel_type is FuelType.PETROL
    assert vehicle.transmission is Transmission.AUTOMATIC
    assert vehicle.mileage_km == 15000


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


# --- Validation (422) -------------------------------------------------------


@pytest.mark.parametrize("missing_field", sorted(VALID_VEHICLE))
def test_missing_field_is_rejected(
    client: TestClient, admin_headers: dict[str, str], missing_field: str
) -> None:
    body = {key: value for key, value in VALID_VEHICLE.items() if key != missing_field}

    response = client.post(VEHICLES_URL, json=body, headers=admin_headers)

    assert response.status_code == 422


@pytest.mark.parametrize(
    "price",
    ["0", "0.00", "-1", "-0.01", "19.999", "100000000.00", "abc", None],
    ids=[
        "zero",
        "zero-2dp",
        "negative",
        "negative-cent",
        "3-decimals",
        "too-large",
        "text",
        "null",
    ],
)
def test_invalid_price_is_rejected(
    client: TestClient, admin_headers: dict[str, str], price: object
) -> None:
    response = client.post(
        VEHICLES_URL, json={**VALID_VEHICLE, "price": price}, headers=admin_headers
    )

    assert response.status_code == 422


@pytest.mark.parametrize("price", ["0.01", "99999999.99"], ids=["smallest", "largest"])
def test_price_at_the_boundaries_is_accepted(
    client: TestClient, admin_headers: dict[str, str], price: str
) -> None:
    response = client.post(
        VEHICLES_URL, json={**VALID_VEHICLE, "price": price}, headers=admin_headers
    )

    assert response.status_code == 201
    assert response.json()["price"] == price


@pytest.mark.parametrize(
    "quantity", [-1, 2.5, "3", True, None], ids=["negative", "fraction", "string", "bool", "null"]
)
def test_invalid_quantity_is_rejected(
    client: TestClient, admin_headers: dict[str, str], quantity: object
) -> None:
    response = client.post(
        VEHICLES_URL, json={**VALID_VEHICLE, "quantity": quantity}, headers=admin_headers
    )

    assert response.status_code == 422


def test_zero_quantity_is_accepted(client: TestClient, admin_headers: dict[str, str]) -> None:
    response = client.post(
        VEHICLES_URL, json={**VALID_VEHICLE, "quantity": 0}, headers=admin_headers
    )

    assert response.status_code == 201


@pytest.mark.parametrize("category", ["spaceship", "SEDAN", ""])
def test_unknown_category_is_rejected(
    client: TestClient, admin_headers: dict[str, str], category: str
) -> None:
    response = client.post(
        VEHICLES_URL, json={**VALID_VEHICLE, "category": category}, headers=admin_headers
    )

    assert response.status_code == 422


@pytest.mark.parametrize("field", ["make", "model"])
@pytest.mark.parametrize("value", ["", "   ", "x" * 51], ids=["empty", "blank", "too-long"])
def test_invalid_make_or_model_is_rejected(
    client: TestClient, admin_headers: dict[str, str], field: str, value: str
) -> None:
    response = client.post(
        VEHICLES_URL, json={**VALID_VEHICLE, field: value}, headers=admin_headers
    )

    assert response.status_code == 422


def test_make_and_model_are_trimmed(client: TestClient, admin_headers: dict[str, str]) -> None:
    response = client.post(
        VEHICLES_URL,
        json={**VALID_VEHICLE, "make": "  Toyota ", "model": "\tCorolla  "},
        headers=admin_headers,
    )

    assert response.status_code == 201
    assert response.json()["make"] == "Toyota"
    assert response.json()["model"] == "Corolla"


# --- Richer vehicle data ------------------------------------------------------


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("year", 1989),
        ("year", NEXT_YEAR + 1),
        ("year", "2020"),
        ("year", 2020.5),
        ("fuel_type", "coal"),
        ("fuel_type", "PETROL"),
        ("transmission", "cvt"),
        ("mileage_km", -1),
        ("mileage_km", 1_000_001),
        ("mileage_km", 1.5),
        ("mileage_km", "100"),
    ],
    ids=[
        "year-too-old",
        "year-too-new",
        "year-string",
        "year-fraction",
        "fuel-unknown",
        "fuel-wrong-case",
        "transmission-unknown",
        "mileage-negative",
        "mileage-too-high",
        "mileage-fraction",
        "mileage-string",
    ],
)
def test_invalid_vehicle_details_are_rejected(
    client: TestClient, admin_headers: dict[str, str], field: str, value: object
) -> None:
    response = client.post(
        VEHICLES_URL, json={**VALID_VEHICLE, field: value}, headers=admin_headers
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    ("field", "value"),
    [("year", 1990), ("year", NEXT_YEAR), ("mileage_km", 0), ("mileage_km", 1_000_000)],
    ids=["oldest-year", "next-year", "new-car", "max-mileage"],
)
def test_vehicle_details_at_the_boundaries_are_accepted(
    client: TestClient, admin_headers: dict[str, str], field: str, value: int
) -> None:
    response = client.post(
        VEHICLES_URL, json={**VALID_VEHICLE, field: value}, headers=admin_headers
    )

    assert response.status_code == 201
    assert response.json()[field] == value


@pytest.mark.parametrize("fuel_type", ["petrol", "diesel", "cng", "electric", "hybrid"])
def test_every_fuel_type_is_accepted(
    client: TestClient, admin_headers: dict[str, str], fuel_type: str
) -> None:
    response = client.post(
        VEHICLES_URL, json={**VALID_VEHICLE, "fuel_type": fuel_type}, headers=admin_headers
    )

    assert response.status_code == 201
