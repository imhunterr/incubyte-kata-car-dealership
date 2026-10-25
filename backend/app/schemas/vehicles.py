"""Request and response bodies for the vehicle endpoints."""

from datetime import date
from decimal import Decimal
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from app.core.categories import FuelType, Transmission, VehicleCategory

VehicleName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
"""A make or model name: trimmed, then 1-50 characters (so blank is invalid)."""

Price = Annotated[Decimal, Field(gt=0, max_digits=10, decimal_places=2)]
"""A positive amount with at most 2 decimals and 10 digits (matches the column)."""

StockQuantity = Annotated[int, Field(ge=0, strict=True)]
"""Units in stock. Strict: ``"3"``, ``3.0`` and ``true`` are rejected, not coerced."""


OLDEST_MODEL_YEAR = 1990
MAX_MILEAGE_KM = 1_000_000

ModelYear = Annotated[int, Field(strict=True, ge=OLDEST_MODEL_YEAR)]
"""A model year from 1990; the upper bound (next year) is checked at runtime."""

Mileage = Annotated[int, Field(strict=True, ge=0, le=MAX_MILEAGE_KM)]
"""Kilometres driven, as a strict integer from 0 to 1,000,000."""


def latest_model_year() -> int:
    """Newest acceptable model year: manufacturers sell next year's models early."""
    return date.today().year + 1


class VehicleWrite(BaseModel):
    """Body of ``POST /api/vehicles`` and ``PUT /api/vehicles/{id}``.

    ``PUT`` is a full replacement, so both use the same fields and rules.
    """

    make: VehicleName
    model: VehicleName
    category: VehicleCategory
    price: Price
    quantity: StockQuantity
    year: ModelYear
    fuel_type: FuelType
    transmission: Transmission
    mileage_km: Mileage

    @field_validator("year")
    @classmethod
    def _year_is_not_in_the_future(cls, year: int) -> int:
        if year > latest_model_year():
            raise ValueError(f"year must not be later than {latest_model_year()}")
        return year


MAX_RESTOCK_QUANTITY = 10_000
"""Upper bound per restock: catches typos and keeps stock far from integer overflow."""


class RestockRequest(BaseModel):
    """Body of ``POST /api/vehicles/{id}/restock``."""

    quantity: Annotated[int, Field(ge=1, le=MAX_RESTOCK_QUANTITY, strict=True)]
    """Number of units to add."""


class VehicleRead(BaseModel):
    """A vehicle as returned by the API. ``price`` is serialised as a string
    (e.g. ``"21999.99"``) so no precision is lost in JSON."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    make: str
    model: str
    category: VehicleCategory
    price: Decimal
    quantity: int
    year: int
    fuel_type: FuelType
    transmission: Transmission
    mileage_km: int


class VehicleSearch(BaseModel):
    """Query parameters of ``GET /api/vehicles/search``.

    Every filter is optional and supplied filters are combined with AND:

    - ``make`` / ``model``: case-insensitive *substring* match. Surrounding
      whitespace is ignored, and a blank value means "no filter".
    - ``category``: exact match.
    - ``min_price`` / ``max_price``: inclusive bounds; ``min_price`` may not
      exceed ``max_price``.
    - ``fuel_type`` / ``transmission``: exact match.
    - ``min_year``: model year at least this; ``max_mileage``: at most this
      many kilometres.
    """

    make: str | None = None
    model: str | None = None
    category: VehicleCategory | None = None
    min_price: Decimal | None = Field(default=None, ge=0)
    max_price: Decimal | None = Field(default=None, ge=0)
    fuel_type: FuelType | None = None
    transmission: Transmission | None = None
    min_year: int | None = None
    max_mileage: int | None = Field(default=None, ge=0)

    @field_validator("make", "model")
    @classmethod
    def _blank_means_no_filter(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @model_validator(mode="after")
    def _price_bounds_are_ordered(self) -> "VehicleSearch":
        if (
            self.min_price is not None
            and self.max_price is not None
            and self.min_price > self.max_price
        ):
            raise ValueError("min_price must not be greater than max_price")
        return self
