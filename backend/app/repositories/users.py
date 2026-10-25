"""Data access for :class:`~app.models.user.User`."""

from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    """Reads and writes users."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, user: User) -> User:
        """Persist a new user and return it with its generated id."""
        self._session.add(user)
        self._session.commit()
        return user
