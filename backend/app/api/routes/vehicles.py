"""Vehicle inventory endpoints.

Reading the inventory requires any authenticated user; changing it requires
an admin. Both rules are enforced here, on the server, through dependencies.
"""

from typing import Annotated, Any

from fastapi import APIRouter, Query, status

from app.api.deps import AdminUserDep, CurrentUserDep, VehicleServiceDep
from app.schemas.vehicles import VehicleRead, VehicleSearch, VehicleWrite

router = APIRouter(prefix="/vehicles", tags=["vehicles"])

_AUTH_ERRORS: dict[int | str, dict[str, Any]] = {
    status.HTTP_401_UNAUTHORIZED: {"description": "Missing or invalid access token"},
    status.HTTP_403_FORBIDDEN: {"description": "Admin privileges required"},
}
_NOT_FOUND: dict[int | str, dict[str, Any]] = {
    status.HTTP_404_NOT_FOUND: {"description": "Vehicle not found"},
}


@router.get(
    "",
    responses={status.HTTP_401_UNAUTHORIZED: _AUTH_ERRORS[status.HTTP_401_UNAUTHORIZED]},
)
def list_vehicles(vehicles: VehicleServiceDep, _user: CurrentUserDep) -> list[VehicleRead]:
    """List every vehicle, including ones that are out of stock, ordered by id."""
    return [VehicleRead.model_validate(vehicle) for vehicle in vehicles.list_all()]


@router.get(
    "/search",
    responses={status.HTTP_401_UNAUTHORIZED: _AUTH_ERRORS[status.HTTP_401_UNAUTHORIZED]},
)
def search_vehicles(
    criteria: Annotated[VehicleSearch, Query()],
    vehicles: VehicleServiceDep,
    _user: CurrentUserDep,
) -> list[VehicleRead]:
    """Search by make, model, category and/or price range (all optional, ANDed)."""
    return [VehicleRead.model_validate(vehicle) for vehicle in vehicles.search(criteria)]


@router.post("", status_code=status.HTTP_201_CREATED, responses=_AUTH_ERRORS)
def create_vehicle(
    body: VehicleWrite, vehicles: VehicleServiceDep, _admin: AdminUserDep
) -> VehicleRead:
    """Add a vehicle to the inventory (admin only)."""
    return VehicleRead.model_validate(vehicles.create(body))


@router.put("/{vehicle_id}", responses=_AUTH_ERRORS | _NOT_FOUND)
def update_vehicle(
    vehicle_id: int, body: VehicleWrite, vehicles: VehicleServiceDep, _admin: AdminUserDep
) -> VehicleRead:
    """Replace a vehicle's details (admin only)."""
    return VehicleRead.model_validate(vehicles.update(vehicle_id, body))


@router.delete(
    "/{vehicle_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=_AUTH_ERRORS | _NOT_FOUND,
)
def delete_vehicle(vehicle_id: int, vehicles: VehicleServiceDep, _admin: AdminUserDep) -> None:
    """Remove a vehicle from the inventory (admin only)."""
    vehicles.delete(vehicle_id)
