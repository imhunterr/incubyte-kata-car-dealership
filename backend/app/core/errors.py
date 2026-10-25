"""Domain errors raised by services and repositories.

They describe *what* went wrong in business terms. The API layer decides how
each one maps to an HTTP status code, so the core never depends on HTTP.
"""


class DomainError(Exception):
    """Base class for every expected, business-level failure."""


class EmailAlreadyRegisteredError(DomainError):
    """An account with this e-mail address already exists."""


class InvalidCredentialsError(DomainError):
    """The e-mail/password pair does not match any account.

    Deliberately does not say *which* part was wrong.
    """
