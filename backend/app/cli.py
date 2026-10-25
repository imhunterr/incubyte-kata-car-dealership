"""Administrative command-line tool.

Registration through the API always creates regular users, so admins are
created (or promoted) here, by someone with access to the server::

    uv run python -m app.cli create-admin --email boss@example.com
    uv run python -m app.cli create-admin --email boss@example.com --password '...'

When ``--password`` is omitted for a new account, it is prompted for without
echoing. Exit codes: 0 on success, 2 on invalid input or usage.
"""

import argparse
import getpass
import sys
from collections.abc import Callable, Sequence

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy.orm import Session

from app.db.session import get_session_factory
from app.repositories.users import UserRepository
from app.schemas.auth import PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH
from app.services.auth import AdminOutcome, AuthService, normalize_email

EXIT_OK = 0
EXIT_INVALID_INPUT = 2

_email_validator: TypeAdapter[str] = TypeAdapter(EmailStr)

_OUTCOME_MESSAGES = {
    AdminOutcome.CREATED: "Created admin {email}",
    AdminOutcome.PROMOTED: "Promoted {email} to admin",
    AdminOutcome.ALREADY_ADMIN: "{email} is already an admin",
}


class InvalidInputError(Exception):
    """A command-line value failed validation."""


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m app.cli", description="Car Dealership administration."
    )
    commands = parser.add_subparsers(dest="command", required=True)

    create_admin = commands.add_parser(
        "create-admin", help="Create an admin account, or promote an existing user to admin."
    )
    create_admin.add_argument("--email", required=True, help="E-mail address of the admin.")
    create_admin.add_argument(
        "--password",
        help="Password for a NEW account (prompted for if omitted). "
        "Ignored when promoting an existing user.",
    )
    return parser


def _validate_email(email: str) -> str:
    try:
        return _email_validator.validate_python(email)
    except ValidationError as error:
        raise InvalidInputError(f"{email!r} is not a valid e-mail address") from error


def _validate_password(password: str) -> str:
    if not PASSWORD_MIN_LENGTH <= len(password) <= PASSWORD_MAX_LENGTH:
        raise InvalidInputError(
            f"password must be {PASSWORD_MIN_LENGTH}-{PASSWORD_MAX_LENGTH} characters long"
        )
    return password


def _create_admin(
    args: argparse.Namespace,
    session_factory: Callable[[], Session],
    read_password: Callable[[str], str],
) -> str:
    """Run ``create-admin`` and return the message to show the operator."""
    email = _validate_email(args.email)

    def password_provider() -> str:
        password = args.password if args.password is not None else read_password("Password: ")
        return _validate_password(password)

    with session_factory() as session:
        outcome = AuthService(UserRepository(session)).ensure_admin(email, password_provider)
    return _OUTCOME_MESSAGES[outcome].format(email=normalize_email(email))


def main(
    argv: Sequence[str] | None = None,
    *,
    session_factory: Callable[[], Session] | None = None,
    read_password: Callable[[str], str] = getpass.getpass,
) -> int:
    """Entry point. Returns the process exit code.

    ``session_factory`` and ``read_password`` are injectable so tests can use
    the test database and avoid interactive prompts.
    """
    args = _build_parser().parse_args(argv)
    factory = session_factory or get_session_factory()

    try:
        message = _create_admin(args, factory, read_password)
    except InvalidInputError as error:
        print(f"error: {error}", file=sys.stderr)
        return EXIT_INVALID_INPUT

    print(message)
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
