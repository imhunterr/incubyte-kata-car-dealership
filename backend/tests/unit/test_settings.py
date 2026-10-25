"""Unit tests for ``app.core.config.Settings``."""

import pytest

from app.core.config import Settings


@pytest.mark.parametrize(
    ("given", "expected"),
    [
        (
            "postgres://user:secret@db.example.com:5432/app?sslmode=require",
            "postgresql+psycopg://user:secret@db.example.com:5432/app?sslmode=require",
        ),
        (
            "postgresql://user:secret@db.example.com/app",
            "postgresql+psycopg://user:secret@db.example.com/app",
        ),
    ],
    ids=["postgres-scheme", "postgresql-scheme"],
)
def test_hosted_database_urls_are_switched_to_the_psycopg_driver(given: str, expected: str) -> None:
    # Hosting providers hand out driver-less URLs, which SQLAlchemy would try
    # to open with psycopg2 (not installed). The app uses psycopg 3.
    assert Settings(database_url=given).database_url == expected


def test_a_url_that_already_names_the_driver_is_kept() -> None:
    url = "postgresql+psycopg://user:secret@localhost:5434/app"

    assert Settings(database_url=url).database_url == url
