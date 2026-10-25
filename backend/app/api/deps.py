"""Reusable FastAPI dependencies, exposed as ``Annotated`` type aliases.

Route handlers declare what they need by type, for example::

    def delete_vehicle(vehicle_id: int, admin: AdminUserDep) -> None: ...

and FastAPI resolves the whole chain (session → service → current user →
role check) before the handler runs.
"""

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.errors import AdminRequiredError, NotAuthenticatedError
from app.core.roles import Role
from app.db.session import get_session
from app.models.user import User
from app.repositories.users import UserRepository
from app.services.auth import AuthService

SessionDep = Annotated[Session, Depends(get_session)]
"""A database session scoped to the current request."""


def get_auth_service(session: SessionDep) -> AuthService:
    """Build the auth service on top of the request's session."""
    return AuthService(UserRepository(session))


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]

# auto_error=False: a missing or non-Bearer header yields None instead of
# FastAPI's default error, so every authentication failure goes through the
# same NotAuthenticatedError → 401 path. Declaring the scheme also adds the
# "Authorize" button to the interactive API docs.
_bearer_scheme = HTTPBearer(auto_error=False, description="Access token from POST /api/auth/login")


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
    auth: AuthServiceDep,
) -> User:
    """Return the user identified by the request's bearer token.

    Raises:
        NotAuthenticatedError: If there is no valid bearer token.
    """
    if credentials is None:
        raise NotAuthenticatedError
    return auth.authenticate(credentials.credentials)


CurrentUserDep = Annotated[User, Depends(get_current_user)]
"""The authenticated user (any role). Responds 401 if not authenticated."""


def require_admin(user: CurrentUserDep) -> User:
    """Return the current user if they are an admin.

    Raises:
        AdminRequiredError: If the user is authenticated but not an admin.
    """
    if user.role is not Role.ADMIN:
        raise AdminRequiredError
    return user


AdminUserDep = Annotated[User, Depends(require_admin)]
"""The authenticated user, who must be an admin. Responds 401 or 403 otherwise."""
