"""Data access for :class:`~app.models.user.User`."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import EmailAlreadyRegisteredError
from app.models.user import User

_UNIQUE_EMAIL_CONSTRAINT = "uq_users_email"


class UserRepository:
    """Reads and writes users."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def get_by_id(self, user_id: int) -> User | None:
        """Return the user with this id, if any."""
        return self._session.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        """Return the user with exactly this (already normalised) e-mail, if any."""
        return self._session.scalars(select(User).where(User.email == email)).one_or_none()

    def add(self, user: User) -> User:
        """Persist a new user and return it with its generated id.

        Uniqueness is enforced by the database itself, which stays correct even
        when two registrations for the same e-mail race each other.

        Raises:
            EmailAlreadyRegisteredError: If the e-mail is already taken.
        """
        self._session.add(user)
        try:
            self._session.commit()
        except IntegrityError as error:
            self._session.rollback()
            if _violated_constraint(error) == _UNIQUE_EMAIL_CONSTRAINT:
                raise EmailAlreadyRegisteredError(user.email) from error
            # Any other integrity failure is unexpected: let it surface as-is.
            raise  # pragma: no cover
        return user

    def save(self, user: User) -> User:
        """Commit changes made to an already-persisted user."""
        self._session.commit()
        return user


def _violated_constraint(error: IntegrityError) -> str | None:
    """Return the name of the constraint behind an integrity error, if known."""
    diagnostics = getattr(error.orig, "diag", None)
    return getattr(diagnostics, "constraint_name", None)
