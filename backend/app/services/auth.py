"""Registration and authentication use cases."""

from dataclasses import dataclass

from app.core.errors import InvalidCredentialsError
from app.core.roles import Role
from app.core.security import create_access_token, hash_password, verify_password
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


def normalize_email(email: str) -> str:
    """Canonical form of an e-mail address: trimmed and lower-cased.

    Lower-casing the whole address (not just the domain) means
    ``Alice@Example.com`` and ``alice@example.com`` are one account, which is
    what users expect in practice.
    """
    return email.strip().lower()
