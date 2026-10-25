"""Data access for :class:`~app.models.vehicle.Vehicle`."""

from collections.abc import Sequence
from decimal import Decimal

from sqlalchemy import ColumnElement, select
from sqlalchemy.orm import InstrumentedAttribute, Session

from app.core.categories import VehicleCategory
from app.models.vehicle import Vehicle

_LIKE_ESCAPE = "\\"


class VehicleRepository:
    """Reads and writes vehicles."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def search(
        self,
        *,
        make: str | None = None,
        model: str | None = None,
        category: VehicleCategory | None = None,
        min_price: Decimal | None = None,
        max_price: Decimal | None = None,
    ) -> Sequence[Vehicle]:
        """Return the vehicles matching every given filter, ordered by id.

        ``None`` means "do not filter on this", so ``search()`` with no
        arguments returns the whole inventory. ``make`` and ``model`` match
        case-insensitively anywhere in the value; price bounds are inclusive.
        """
        conditions: list[ColumnElement[bool]] = []
        if make is not None:
            conditions.append(_contains(Vehicle.make, make))
        if model is not None:
            conditions.append(_contains(Vehicle.model, model))
        if category is not None:
            conditions.append(Vehicle.category == category)
        if min_price is not None:
            conditions.append(Vehicle.price >= min_price)
        if max_price is not None:
            conditions.append(Vehicle.price <= max_price)

        query = select(Vehicle).where(*conditions).order_by(Vehicle.id)
        return self._session.scalars(query).all()

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


def _contains(column: InstrumentedAttribute[str], term: str) -> ColumnElement[bool]:
    """Case-insensitive "contains" that treats ``%``, ``_`` and ``\\`` literally.

    Without escaping, user input such as ``%`` would act as a LIKE wildcard
    and match every row.
    """
    escaped = (
        term.replace(_LIKE_ESCAPE, _LIKE_ESCAPE * 2)
        .replace("%", _LIKE_ESCAPE + "%")
        .replace("_", _LIKE_ESCAPE + "_")
    )
    return column.ilike(f"%{escaped}%", escape=_LIKE_ESCAPE)
