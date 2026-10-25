"""Unit tests for the production engine/session wiring in ``app.db.session``.

The rest of the suite replaces these with the test database, so they are
checked here directly. Creating an engine or a session does not connect.
"""

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_engine, get_session, get_session_factory


def test_engine_targets_the_configured_database() -> None:
    assert get_engine().url.render_as_string(hide_password=False) == get_settings().database_url


def test_engine_and_session_factory_are_created_once_per_process() -> None:
    assert get_engine() is get_engine()
    assert get_session_factory() is get_session_factory()


def test_get_session_yields_a_session_bound_to_the_engine() -> None:
    sessions = get_session()

    session = next(sessions)

    assert isinstance(session, Session)
    assert session.get_bind() is get_engine()
    sessions.close()
