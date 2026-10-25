"""Tests for data migrations, run against a scratch database.

The rest of the suite always starts from the latest schema. These tests
instead build an *older* schema, insert data the way it existed then, and
upgrade, to prove existing rows survive and get sensible values.
"""

import os
import uuid
from collections.abc import Iterator

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from tests.conftest import BACKEND_DIR, TEST_DATABASE_URL

# The revision just before vehicles gained year/fuel/transmission/mileage.
BEFORE_VEHICLE_DETAILS = "cbcf1f8cce7a"


@pytest.fixture
def scratch_database_url() -> Iterator[str]:
    """URL of a brand-new, empty database that is dropped afterwards."""
    name = f"migration_test_{uuid.uuid4().hex[:8]}"
    admin_url = make_url(os.environ.get("TEST_DATABASE_URL", TEST_DATABASE_URL))
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as connection:
        connection.execute(text(f'CREATE DATABASE "{name}"'))
    try:
        yield admin_url.set(database=name).render_as_string(hide_password=False)
    finally:
        with admin_engine.connect() as connection:
            connection.execute(text(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)'))
        admin_engine.dispose()


def _alembic(url: str) -> Config:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", url)
    return config


def test_existing_vehicles_get_default_details_when_the_columns_are_added(
    scratch_database_url: str,
) -> None:
    config = _alembic(scratch_database_url)
    command.upgrade(config, BEFORE_VEHICLE_DETAILS)
    engine = create_engine(scratch_database_url)
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO vehicles (make, model, category, price, quantity) "
                "VALUES ('Toyota', 'Corolla', 'sedan', 21999.99, 3)"
            )
        )

    command.upgrade(config, "head")

    with engine.connect() as connection:
        row = connection.execute(
            text("SELECT year, fuel_type, transmission, mileage_km FROM vehicles")
        ).one()
    engine.dispose()
    assert row.year >= 1990
    assert row.fuel_type == "petrol"
    assert row.transmission == "manual"
    assert row.mileage_km == 0
