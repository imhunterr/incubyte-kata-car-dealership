"""Translation of domain errors into HTTP responses.

Services raise :class:`~app.core.errors.DomainError` subclasses that describe
business failures. This module is the single place that decides which status
code and message each one becomes, so routers stay free of try/except blocks.
"""

from dataclasses import dataclass, field

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.core.errors import DomainError, EmailAlreadyRegisteredError, InvalidCredentialsError


@dataclass(frozen=True, slots=True)
class ErrorResponse:
    """How one kind of domain error is presented over HTTP."""

    status_code: int
    detail: str
    headers: dict[str, str] = field(default_factory=dict)


ERROR_RESPONSES: dict[type[DomainError], ErrorResponse] = {
    EmailAlreadyRegisteredError: ErrorResponse(
        status.HTTP_409_CONFLICT, "Email is already registered"
    ),
    InvalidCredentialsError: ErrorResponse(
        status.HTTP_401_UNAUTHORIZED,
        "Invalid email or password",
        headers={"WWW-Authenticate": "Bearer"},
    ),
}


def _response_for(error: DomainError) -> ErrorResponse:
    """Find the mapping for ``error``, honouring subclassing (most specific wins)."""
    for error_type in type(error).__mro__:
        if error_type in ERROR_RESPONSES:
            return ERROR_RESPONSES[error_type]
    # A DomainError with no mapping is a programming mistake: fail loudly.
    raise LookupError(f"No HTTP mapping for {type(error).__name__}") from error


async def _handle_domain_error(_request: Request, error: Exception) -> JSONResponse:
    # Registered for DomainError only; the check narrows the type for mypy.
    if not isinstance(error, DomainError):
        raise error
    response = _response_for(error)
    return JSONResponse(
        status_code=response.status_code,
        content={"detail": response.detail},
        headers=response.headers or None,
    )


def register_error_handlers(app: FastAPI) -> None:
    """Install the domain-error handler on ``app``."""
    app.add_exception_handler(DomainError, _handle_domain_error)
