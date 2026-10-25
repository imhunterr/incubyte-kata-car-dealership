"""Tests for deleting a vehicle, ``DELETE /api/vehicles/{id}`` (admin only)."""

from collections.abc import Callable

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle


def _url(vehicle_id: int) -> str:
    return f"/api/vehicles/{vehicle_id}"


def test_admin_deletes_a_vehicle_and_gets_204_with_no_body(
    client: TestClient, admin_headers: dict[str, str], create_vehicle: Callable[..., Vehicle]
) -> None:
    vehicle = create_vehicle()

    response = client.delete(_url(vehicle.id), headers=admin_headers)

    assert response.status_code == 204
    assert response.content == b""


def test_deleted_vehicle_is_gone(
    client: TestClient,
    admin_headers: dict[str, str],
    create_vehicle: Callable[..., Vehicle],
    db_session: Session,
) -> None:
    vehicle = create_vehicle()
    vehicle_id = vehicle.id

    client.delete(_url(vehicle_id), headers=admin_headers)

    db_session.expunge_all()
    assert db_session.get(Vehicle, vehicle_id) is None
    listed = client.get("/api/vehicles", headers=admin_headers).json()
    assert vehicle_id not in [item["id"] for item in listed]


def test_delete_leaves_other_vehicles_in_place(
    client: TestClient,
    admin_headers: dict[str, str],
    create_vehicle: Callable[..., Vehicle],
) -> None:
    target = create_vehicle(model="Corolla")
    bystander = create_vehicle(make="Honda", model="Civic")

    client.delete(_url(target.id), headers=admin_headers)

    listed = client.get("/api/vehicles", headers=admin_headers).json()
    assert [item["id"] for item in listed] == [bystander.id]


def test_deleting_an_unknown_vehicle_returns_404(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    response = client.delete(_url(999_999), headers=admin_headers)

    assert response.status_code == 404
    assert response.json()["detail"] == "Vehicle not found"


def test_deleting_the_same_vehicle_twice_returns_404_the_second_time(
    client: TestClient, admin_headers: dict[str, str], create_vehicle: Callable[..., Vehicle]
) -> None:
    vehicle = create_vehicle()
    client.delete(_url(vehicle.id), headers=admin_headers)

    response = client.delete(_url(vehicle.id), headers=admin_headers)

    assert response.status_code == 404


def test_regular_user_cannot_delete_a_vehicle(
    client: TestClient,
    user_headers: dict[str, str],
    create_vehicle: Callable[..., Vehicle],
    db_session: Session,
) -> None:
    vehicle = create_vehicle()

    response = client.delete(_url(vehicle.id), headers=user_headers)

    assert response.status_code == 403
    db_session.expunge_all()
    assert db_session.get(Vehicle, vehicle.id) is not None


def test_anonymous_caller_cannot_delete_a_vehicle(
    client: TestClient, create_vehicle: Callable[..., Vehicle]
) -> None:
    vehicle = create_vehicle()

    response = client.delete(_url(vehicle.id))

    assert response.status_code == 401
