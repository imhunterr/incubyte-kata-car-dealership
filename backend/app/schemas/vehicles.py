"""Request and response bodies for the vehicle endpoints."""

from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

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
