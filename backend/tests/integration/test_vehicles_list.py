"""Tests for listing the inventory, ``GET /api/vehicles`` (any authenticated user)."""

from collections.abc import Callable

from fastapi.testclient import TestClient

from app.core.categories import FuelType, Transmission, VehicleCategory
from app.models.vehicle import Vehicle
from tests.helpers import VEHICLES_URL


def test_empty_inventory_returns_an_empty_list(
    client: TestClient, user_headers: dict[str, str]
) -> None:
    response = client.get(VEHICLES_URL, headers=user_headers)

    assert response.status_code == 200
    assert response.json() == []


def test_lists_every_vehicle_ordered_by_id(
    client: TestClient, user_headers: dict[str, str], create_vehicle: Callable[..., Vehicle]
) -> None:
    corolla = create_vehicle(make="Toyota", model="Corolla")
    civic = create_vehicle(make="Honda", model="Civic", category=VehicleCategory.HATCHBACK)
    f150 = create_vehicle(make="Ford", model="F-150", category=VehicleCategory.TRUCK)

    response = client.get(VEHICLES_URL, headers=user_headers)

    assert [vehicle["id"] for vehicle in response.json()] == [corolla.id, civic.id, f150.id]


def test_lists_vehicles_with_all_their_fields(
    client: TestClient, user_headers: dict[str, str], create_vehicle: Callable[..., Vehicle]
) -> None:
    vehicle = create_vehicle(
        make="Mazda",
        model="MX-5",
        category=VehicleCategory.CONVERTIBLE,
        price="31500",
        quantity=2,
        year=2021,
        fuel_type=FuelType.PETROL,
        transmission=Transmission.MANUAL,
        mileage_km=8000,
    )

    response = client.get(VEHICLES_URL, headers=user_headers)

    assert response.json() == [
        {
            "id": vehicle.id,
            "make": "Mazda",
            "model": "MX-5",
            "category": "convertible",
            "price": "31500.00",
            "quantity": 2,
            "year": 2021,
            "fuel_type": "petrol",
            "transmission": "manual",
            "mileage_km": 8000,
        }
    ]


def test_includes_vehicles_that_are_out_of_stock(
    client: TestClient, user_headers: dict[str, str], create_vehicle: Callable[..., Vehicle]
) -> None:
    # The UI shows sold-out vehicles with a disabled Purchase button.
    create_vehicle(quantity=0)

    response = client.get(VEHICLES_URL, headers=user_headers)

    assert [vehicle["quantity"] for vehicle in response.json()] == [0]


def test_admins_can_list_vehicles_too(client: TestClient, admin_headers: dict[str, str]) -> None:
    response = client.get(VEHICLES_URL, headers=admin_headers)

    assert response.status_code == 200


def test_anonymous_caller_cannot_list_vehicles(client: TestClient) -> None:
    response = client.get(VEHICLES_URL)

    assert response.status_code == 401
