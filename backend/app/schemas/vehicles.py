"""Request and response bodies for the vehicle endpoints."""

from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.core.categories import VehicleCategory


class VehicleWrite(BaseModel):
    """Body of ``POST /api/vehicles`` and ``PUT /api/vehicles/{id}``.

    ``PUT`` is a full replacement, so both use the same fields and rules.
    """

    make: str
    model: str
    category: VehicleCategory
    price: Decimal
    quantity: int


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
