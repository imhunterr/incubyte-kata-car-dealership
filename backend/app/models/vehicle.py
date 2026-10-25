"""The ``vehicles`` table: the dealership's inventory."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.categories import VehicleCategory
from app.db.base import Base
from app.db.types import string_enum


class Vehicle(Base):
    """A vehicle model the dealership sells, with the number of units in stock."""

    __tablename__ = "vehicles"
    __table_args__ = (
        # Defence in depth: the API validates these too, but the database
        # guarantees no code path can ever store impossible stock or prices.
        CheckConstraint("quantity >= 0", name="quantity_non_negative"),
        CheckConstraint("price > 0", name="price_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    make: Mapped[str] = mapped_column(String(50))
    model: Mapped[str] = mapped_column(String(50))
    category: Mapped[VehicleCategory] = mapped_column(
        string_enum(VehicleCategory, name="vehicle_category")
    )
    # Exact decimal arithmetic for money: up to 99,999,999.99.
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    quantity: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
