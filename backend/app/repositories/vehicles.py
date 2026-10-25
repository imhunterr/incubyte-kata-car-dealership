"""Data access for :class:`~app.models.vehicle.Vehicle`."""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle


class VehicleRepository:
    """Reads and writes vehicles."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def list_all(self) -> Sequence[Vehicle]:
        """Return every vehicle, oldest first (ordered by id)."""
        return self._session.scalars(select(Vehicle).order_by(Vehicle.id)).all()

    def get(self, vehicle_id: int) -> Vehicle | None:
        """Return the vehicle with this id, if any."""
        return self._session.get(Vehicle, vehicle_id)

    def add(self, vehicle: Vehicle) -> Vehicle:
        """Persist a new vehicle and return it as stored.

        The row is re-read after the commit so values reflect what the
        database holds (e.g. the price rounded to its 2-decimal column).
        """
        self._session.add(vehicle)
        self._session.commit()
        self._session.refresh(vehicle)
        return vehicle

    def save(self, vehicle: Vehicle) -> Vehicle:
        """Commit changes made to an already-persisted vehicle and re-read it."""
        self._session.commit()
        self._session.refresh(vehicle)
        return vehicle

    def delete(self, vehicle: Vehicle) -> None:
        """Remove a vehicle permanently."""
        self._session.delete(vehicle)
        self._session.commit()
