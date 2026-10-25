"""Data access for :class:`~app.models.vehicle.Vehicle`."""

from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle


class VehicleRepository:
    """Reads and writes vehicles."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, vehicle: Vehicle) -> Vehicle:
        """Persist a new vehicle and return it as stored.

        The row is re-read after the commit so values reflect what the
        database holds (e.g. the price rounded to its 2-decimal column).
        """
        self._session.add(vehicle)
        self._session.commit()
        self._session.refresh(vehicle)
        return vehicle
