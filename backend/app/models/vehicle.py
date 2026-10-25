"""The ``vehicles`` table: the dealership's inventory."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.categories import VehicleCategory
from app.db.base import Base


class Vehicle(Base):
    """A vehicle model the dealership sells, with the number of units in stock."""

    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(primary_key=True)
    make: Mapped[str] = mapped_column(String(50))
    model: Mapped[str] = mapped_column(String(50))
    category: Mapped[VehicleCategory] = mapped_column(
        # A string column with a CHECK constraint (not a native enum), so new
        # categories only need a simple migration.
        Enum(
            VehicleCategory,
            name="vehicle_category",
            native_enum=False,
            create_constraint=True,
            length=20,
            values_callable=lambda categories: [category.value for category in categories],
        )
    )
    # Exact decimal arithmetic for money: up to 99,999,999.99.
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    quantity: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
