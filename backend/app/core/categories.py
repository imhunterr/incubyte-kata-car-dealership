"""Vehicle body categories offered by the dealership."""

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
