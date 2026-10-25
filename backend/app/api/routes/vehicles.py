"""Vehicle inventory endpoints.

Reading the inventory requires any authenticated user; changing it requires
an admin. Both rules are enforced here, on the server, through dependencies.
"""

from typing import Any

from fastapi import APIRouter, status

from app.api.deps import AdminUserDep, VehicleServiceDep
from app.schemas.vehicles import VehicleRead, VehicleWrite

router = APIRouter(prefix="/vehicles", tags=["vehicles"])

_AUTH_ERRORS: dict[int | str, dict[str, Any]] = {
    status.HTTP_401_UNAUTHORIZED: {"description": "Missing or invalid access token"},
    status.HTTP_403_FORBIDDEN: {"description": "Admin privileges required"},
}


@router.post("", status_code=status.HTTP_201_CREATED, responses=_AUTH_ERRORS)
def create_vehicle(
    body: VehicleWrite, vehicles: VehicleServiceDep, _admin: AdminUserDep
) -> VehicleRead:
    """Add a vehicle to the inventory (admin only)."""
    return VehicleRead.model_validate(vehicles.create(body))
