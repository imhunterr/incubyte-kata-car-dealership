"""Inventory management use cases: adding and maintaining vehicles."""

from collections.abc import Sequence

from app.core.errors import VehicleNotFoundError
from app.models.vehicle import Vehicle
from app.repositories.vehicles import VehicleRepository
from app.schemas.vehicles import VehicleWrite


class VehicleService:
    """Business operations on the vehicle inventory."""

    def __init__(self, vehicles: VehicleRepository) -> None:
        self._vehicles = vehicles

    def list_all(self) -> Sequence[Vehicle]:
        """Return the whole inventory, including vehicles that are out of stock."""
        return self._vehicles.list_all()

    def create(self, data: VehicleWrite) -> Vehicle:
        """Add a vehicle to the inventory and return it."""
        return self._vehicles.add(Vehicle(**data.model_dump()))

    def update(self, vehicle_id: int, data: VehicleWrite) -> Vehicle:
        """Replace every editable field of a vehicle and return it.

        Raises:
            VehicleNotFoundError: If no vehicle has this id.
        """
        vehicle = self._get_or_raise(vehicle_id)
        for field, value in data.model_dump().items():
            setattr(vehicle, field, value)
        return self._vehicles.save(vehicle)

    def _get_or_raise(self, vehicle_id: int) -> Vehicle:
        vehicle = self._vehicles.get(vehicle_id)
        if vehicle is None:
            raise VehicleNotFoundError(vehicle_id)
        return vehicle
