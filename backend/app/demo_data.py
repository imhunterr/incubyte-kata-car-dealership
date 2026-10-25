"""Sample inventory for local development, demos and screenshots.

Loaded with ``python -m app.cli seed-demo``. It spans every category, fuel
type and transmission and includes a sold-out vehicle, so every UI state and
filter can be seen.
"""

from decimal import Decimal

from app.core.categories import FuelType, Transmission, VehicleCategory
from app.schemas.vehicles import VehicleWrite


def _vehicle(
    make: str,
    model: str,
    category: VehicleCategory,
    price: str,
    quantity: int,
    *,
    year: int,
    fuel: FuelType,
    transmission: Transmission,
    km: int,
) -> VehicleWrite:
    return VehicleWrite(
        make=make,
        model=model,
        category=category,
        price=Decimal(price),
        quantity=quantity,
        year=year,
        fuel_type=fuel,
        transmission=transmission,
        mileage_km=km,
    )


_P, _D, _C, _E, _H = (
    FuelType.PETROL,
    FuelType.DIESEL,
    FuelType.CNG,
    FuelType.ELECTRIC,
    FuelType.HYBRID,
)
_MAN, _AUTO = Transmission.MANUAL, Transmission.AUTOMATIC


DEMO_VEHICLES: tuple[VehicleWrite, ...] = (
    _vehicle(
        "Toyota",
        "Corolla",
        VehicleCategory.SEDAN,
        "21999.99",
        8,
        year=2022,
        fuel=_H,
        transmission=_AUTO,
        km=18500,
    ),
    _vehicle(
        "Honda",
        "Accord",
        VehicleCategory.SEDAN,
        "28500.00",
        5,
        year=2021,
        fuel=_P,
        transmission=_AUTO,
        km=32000,
    ),
    _vehicle(
        "Tesla",
        "Model 3",
        VehicleCategory.SEDAN,
        "42990.00",
        7,
        year=2023,
        fuel=_E,
        transmission=_AUTO,
        km=9000,
    ),
    _vehicle(
        "Toyota",
        "RAV4",
        VehicleCategory.SUV,
        "32450.00",
        6,
        year=2022,
        fuel=_H,
        transmission=_AUTO,
        km=24000,
    ),
    _vehicle(
        "Hyundai",
        "Tucson",
        VehicleCategory.SUV,
        "29900.00",
        0,
        year=2020,
        fuel=_D,
        transmission=_AUTO,
        km=41000,
    ),
    _vehicle(
        "Kia",
        "Sportage",
        VehicleCategory.SUV,
        "27990.00",
        1,
        year=2021,
        fuel=_C,
        transmission=_MAN,
        km=36500,
    ),
    _vehicle(
        "Volkswagen",
        "Golf",
        VehicleCategory.HATCHBACK,
        "24990.00",
        4,
        year=2019,
        fuel=_P,
        transmission=_MAN,
        km=52000,
    ),
    _vehicle(
        "Ford",
        "Mustang",
        VehicleCategory.COUPE,
        "38000.00",
        2,
        year=2020,
        fuel=_P,
        transmission=_MAN,
        km=27000,
    ),
    _vehicle(
        "Mazda",
        "MX-5 Miata",
        VehicleCategory.CONVERTIBLE,
        "31500.00",
        3,
        year=2023,
        fuel=_P,
        transmission=_MAN,
        km=6000,
    ),
    _vehicle(
        "Ford",
        "F-150",
        VehicleCategory.TRUCK,
        "45999.00",
        5,
        year=2021,
        fuel=_D,
        transmission=_AUTO,
        km=45000,
    ),
    _vehicle(
        "Chrysler",
        "Pacifica",
        VehicleCategory.VAN,
        "41250.00",
        2,
        year=2022,
        fuel=_H,
        transmission=_AUTO,
        km=21000,
    ),
    _vehicle(
        "Subaru",
        "Outback",
        VehicleCategory.WAGON,
        "33995.00",
        4,
        year=2018,
        fuel=_P,
        transmission=_AUTO,
        km=68000,
    ),
)
