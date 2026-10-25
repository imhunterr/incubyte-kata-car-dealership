"""Engine and session lifecycle.

The engine (and its connection pool) is created lazily, once per process, so
importing the application never opens a database connection by itself.
"""

from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


@lru_cache
def get_engine() -> Engine:
    """Return the process-wide engine for the configured database."""
    return create_engine(get_settings().database_url, pool_pre_ping=True)


@lru_cache
def get_session_factory() -> sessionmaker[Session]:
    """Return the process-wide session factory bound to :func:`get_engine`."""
    return sessionmaker(bind=get_engine(), expire_on_commit=False)


def get_session() -> Iterator[Session]:
    """FastAPI dependency: yield one session per request and always close it."""
    with get_session_factory()() as session:
        yield session
