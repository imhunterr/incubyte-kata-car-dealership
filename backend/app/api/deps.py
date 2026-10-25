"""Reusable FastAPI dependencies, exposed as ``Annotated`` type aliases."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.repositories.users import UserRepository
from app.services.auth import AuthService

SessionDep = Annotated[Session, Depends(get_session)]
"""A database session scoped to the current request."""


def get_auth_service(session: SessionDep) -> AuthService:
    """Build the auth service on top of the request's session."""
    return AuthService(UserRepository(session))


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
