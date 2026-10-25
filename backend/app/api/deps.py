"""Reusable FastAPI dependencies, exposed as ``Annotated`` type aliases."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.session import get_session

SessionDep = Annotated[Session, Depends(get_session)]
"""A database session scoped to the current request."""
