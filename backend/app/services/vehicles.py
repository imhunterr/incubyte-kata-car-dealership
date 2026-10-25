"""Inventory management use cases: adding and maintaining vehicles."""

from collections.abc import Sequence

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
