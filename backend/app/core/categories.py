"""Enumerations that describe a vehicle."""

from enum import StrEnum


class VehicleCategory(StrEnum):
    """The body style a vehicle is listed and filtered under."""

    SEDAN = "sedan"
    SUV = "suv"
    HATCHBACK = "hatchback"
    COUPE = "coupe"
    CONVERTIBLE = "convertible"
    TRUCK = "truck"
    VAN = "van"
    WAGON = "wagon"


class FuelType(StrEnum):
    """What powers the vehicle."""

    PETROL = "petrol"
    DIESEL = "diesel"
    CNG = "cng"
    ELECTRIC = "electric"
    HYBRID = "hybrid"


class Transmission(StrEnum):
    """Gearbox type."""

    MANUAL = "manual"
    AUTOMATIC = "automatic"
