"""Registration and authentication use cases."""

from collections.abc import Callable
from dataclasses import dataclass
from enum import StrEnum

from app.core.errors import InvalidCredentialsError, NotAuthenticatedError
from app.core.roles import Role
from app.core.security import (
    InvalidTokenError,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories.users import UserRepository

# Verified against when the e-mail is unknown, so a failed login takes about
# as long whether or not the account exists (no user enumeration by timing).
_DUMMY_PASSWORD_HASH = hash_password("not-a-real-password")


@dataclass(frozen=True, slots=True)
class LoginResult:
    """A successful login: the issued access token and the user it belongs to."""

    access_token: str
    user: User


class AdminOutcome(StrEnum):
    """What :meth:`AuthService.ensure_admin` did."""

    CREATED = "created"
    PROMOTED = "promoted"
    ALREADY_ADMIN = "already_admin"


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

    def ensure_admin(self, email: str, password_provider: Callable[[], str]) -> AdminOutcome:
        """Make sure an admin account exists for ``email``.

        - No account yet: create one with the admin role. Only in this case is
          ``password_provider`` called, so a password is never asked for (or
          changed) when an existing user is promoted.
        - Existing regular user: promote to admin, keeping their password.
        - Existing admin: nothing to do.

        Exceptions raised by ``password_provider`` (e.g. a validation error)
        propagate before anything is written.
        """
        normalized_email = normalize_email(email)
        user = self._users.get_by_email(normalized_email)

        if user is None:
            admin = User(
                email=normalized_email,
                password_hash=hash_password(password_provider()),
                role=Role.ADMIN,
            )
            self._users.add(admin)
            return AdminOutcome.CREATED

        if user.role is Role.ADMIN:
            return AdminOutcome.ALREADY_ADMIN

        user.role = Role.ADMIN
        self._users.save(user)
        return AdminOutcome.PROMOTED

    def login(self, email: str, password: str) -> LoginResult:
        """Check credentials and issue an access token.

        Raises:
            InvalidCredentialsError: If the e-mail is unknown or the password
                is wrong (callers cannot tell which).
        """
        user = self._users.get_by_email(normalize_email(email))
        if user is None:
            verify_password(password, _DUMMY_PASSWORD_HASH)
            raise InvalidCredentialsError
        if not verify_password(password, user.password_hash):
            raise InvalidCredentialsError

        token = create_access_token(user_id=user.id, role=user.role)
        return LoginResult(access_token=token, user=user)

    def authenticate(self, access_token: str) -> User:
        """Resolve an access token to the user it was issued for.

        The user is re-read from the database on every request, so a deleted
        account loses access immediately and role changes take effect without
        waiting for old tokens to expire.

        Raises:
            NotAuthenticatedError: If the token is invalid or its user no
                longer exists.
        """
        try:
            claims = decode_access_token(access_token)
        except InvalidTokenError as error:
            raise NotAuthenticatedError from error

        user = self._users.get_by_id(claims.user_id)
        if user is None:
            raise NotAuthenticatedError
        return user


def normalize_email(email: str) -> str:
    """Canonical form of an e-mail address: trimmed and lower-cased.

    Lower-casing the whole address (not just the domain) means
    ``Alice@Example.com`` and ``alice@example.com`` are one account, which is
    what users expect in practice.
    """
    return email.strip().lower()
