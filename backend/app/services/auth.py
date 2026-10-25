"""Registration and authentication use cases."""

from app.core.roles import Role
from app.core.security import hash_password
from app.models.user import User
from app.repositories.users import UserRepository


class AuthService:
    """Creates accounts and verifies credentials."""

    def __init__(self, users: UserRepository) -> None:
        self._users = users

    def register(self, email: str, password: str) -> User:
        """Create a regular (non-admin) account and return it.

        The role is always :attr:`Role.USER`; admins are created out-of-band.
        E-mails are stored normalised (see :func:`normalize_email`).

        Raises:
            EmailAlreadyRegisteredError: If the e-mail is already taken.
        """
        user = User(
            email=normalize_email(email),
            password_hash=hash_password(password),
            role=Role.USER,
        )
        return self._users.add(user)


def normalize_email(email: str) -> str:
    """Canonical form of an e-mail address: trimmed and lower-cased.

    Lower-casing the whole address (not just the domain) means
    ``Alice@Example.com`` and ``alice@example.com`` are one account, which is
    what users expect in practice.
    """
    return email.strip().lower()
