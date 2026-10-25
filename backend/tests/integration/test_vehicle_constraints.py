"""Database-level guarantees on the ``vehicles`` table.

The API validates input, but the database must also refuse impossible
values, so no code path (or future bug) can store them.
"""

from decimal import Decimal

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.categories import VehicleCategory
from app.models.vehicle import Vehicle


def _vehicle(**overrides: object) -> Vehicle:
    fields: dict[str, object] = {
        "make": "Toyota",
        "model": "Corolla",
        "category": VehicleCategory.SEDAN,
        "price": Decimal("21999.99"),
        "quantity": 1,
    }
    return Vehicle(**(fields | overrides))


def test_database_rejects_negative_quantity(db_session: Session) -> None:
    db_session.add(_vehicle(quantity=-1))

    with pytest.raises(IntegrityError, match="ck_vehicles_quantity_non_negative"):
        db_session.commit()


@pytest.mark.parametrize("price", [Decimal("0"), Decimal("-5.00")])
def test_database_rejects_non_positive_price(db_session: Session, price: Decimal) -> None:
    db_session.add(_vehicle(price=price))

    with pytest.raises(IntegrityError, match="ck_vehicles_price_positive"):
        db_session.commit()
