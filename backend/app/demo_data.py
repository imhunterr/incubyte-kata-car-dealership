"""Sample inventory for local development, demos and screenshots.

Loaded with ``python -m app.cli seed-demo``. It spans every category and
includes a sold-out vehicle, so every UI state can be seen.
"""

from decimal import Decimal

from app.core.categories import VehicleCategory
from app.schemas.vehicles import VehicleWrite


def _vehicle(
    make: str, model: str, category: VehicleCategory, price: str, quantity: int
) -> VehicleWrite:
    return VehicleWrite(
        make=make, model=model, category=category, price=Decimal(price), quantity=quantity
    )


DEMO_VEHICLES: tuple[VehicleWrite, ...] = (
    _vehicle("Toyota", "Corolla", VehicleCategory.SEDAN, "21999.99", 8),
    _vehicle("Honda", "Accord", VehicleCategory.SEDAN, "28500.00", 5),
    _vehicle("Tesla", "Model 3", VehicleCategory.SEDAN, "42990.00", 7),
    _vehicle("Toyota", "RAV4", VehicleCategory.SUV, "32450.00", 6),
    _vehicle("Hyundai", "Tucson", VehicleCategory.SUV, "29900.00", 0),
    _vehicle("Kia", "Sportage", VehicleCategory.SUV, "27990.00", 1),
    _vehicle("Volkswagen", "Golf", VehicleCategory.HATCHBACK, "24990.00", 4),
    _vehicle("Ford", "Mustang", VehicleCategory.COUPE, "38000.00", 2),
    _vehicle("Mazda", "MX-5 Miata", VehicleCategory.CONVERTIBLE, "31500.00", 3),
    _vehicle("Ford", "F-150", VehicleCategory.TRUCK, "45999.00", 5),
    _vehicle("Chrysler", "Pacifica", VehicleCategory.VAN, "41250.00", 2),
    _vehicle("Subaru", "Outback", VehicleCategory.WAGON, "33995.00", 4),
)
