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
        """
        user = User(email=email, password_hash=hash_password(password), role=Role.USER)
        return self._users.add(user)
