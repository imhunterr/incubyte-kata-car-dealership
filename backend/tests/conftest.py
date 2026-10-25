"""Shared pytest fixtures for the API test suite.

Integration tests run against a real PostgreSQL database (``TEST_DATABASE_URL``,
by default the ``dealership_test`` database created by ``docker compose``).

- The schema is rebuilt once per test session by running the Alembic
  migrations, so every test run also proves the migrations work.
- After each test every table is truncated. Tests stay independent while the
  code under test is still free to commit, which the concurrency tests need.
"""

import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.db.session import get_session
from app.main import create_app

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://dealership:dealership@localhost:5434/dealership_test",
)
BACKEND_DIR = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="session")
def engine() -> Iterator[Engine]:
    """Engine for the test database, with a freshly migrated schema."""
    test_engine = create_engine(TEST_DATABASE_URL)
    with test_engine.begin() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))

    alembic_config = Config(str(BACKEND_DIR / "alembic.ini"))
    alembic_config.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)
    command.upgrade(alembic_config, "head")

    yield test_engine
    test_engine.dispose()


@pytest.fixture
def session_factory(engine: Engine) -> Iterator[sessionmaker[Session]]:
    """Session factory for the test database; empties every table afterwards."""
    yield sessionmaker(bind=engine, expire_on_commit=False)

    table_names = ", ".join(table.name for table in Base.metadata.sorted_tables)
    if table_names:
        with engine.begin() as connection:
            connection.execute(text(f"TRUNCATE {table_names} RESTART IDENTITY CASCADE"))


@pytest.fixture
def db_session(session_factory: sessionmaker[Session]) -> Iterator[Session]:
    """A session for arranging data and asserting on it directly in tests."""
    with session_factory() as session:
        yield session


@pytest.fixture
def client(session_factory: sessionmaker[Session]) -> Iterator[TestClient]:
    """An HTTP client for a fresh app instance wired to the test database."""

    def get_test_session() -> Iterator[Session]:
        with session_factory() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = get_test_session
    with TestClient(app) as test_client:
        yield test_client
