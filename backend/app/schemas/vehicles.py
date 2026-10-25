"""Request and response bodies for the vehicle endpoints."""

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

from app.core.categories import VehicleCategory

VehicleName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
"""A make or model name: trimmed, then 1-50 characters (so blank is invalid)."""

Price = Annotated[Decimal, Field(gt=0, max_digits=10, decimal_places=2)]
"""A positive amount with at most 2 decimals and 10 digits (matches the column)."""

StockQuantity = Annotated[int, Field(ge=0, strict=True)]
"""Units in stock. Strict: ``"3"``, ``3.0`` and ``true`` are rejected, not coerced."""


class VehicleWrite(BaseModel):
    """Body of ``POST /api/vehicles`` and ``PUT /api/vehicles/{id}``.

    ``PUT`` is a full replacement, so both use the same fields and rules.
    """

    make: VehicleName
    model: VehicleName
    category: VehicleCategory
    price: Price
    quantity: StockQuantity


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


class VehicleSearch(BaseModel):
    """Query parameters of ``GET /api/vehicles/search``.

    Every filter is optional and supplied filters are combined with AND:

    - ``make`` / ``model``: case-insensitive *substring* match. Surrounding
      whitespace is ignored, and a blank value means "no filter".
    - ``category``: exact match.
    - ``min_price`` / ``max_price``: inclusive bounds; ``min_price`` may not
      exceed ``max_price``.
    """

    make: str | None = None
    model: str | None = None
    category: VehicleCategory | None = None
    min_price: Decimal | None = Field(default=None, ge=0)
    max_price: Decimal | None = Field(default=None, ge=0)

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
