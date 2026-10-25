"""Authentication endpoints: registration and login."""

from fastapi import APIRouter, status

from app.api.deps import AuthServiceDep
from app.schemas.auth import RegisterRequest, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, auth: AuthServiceDep) -> UserRead:
    """Create a new user account with the ``user`` role."""
    user = auth.register(email=body.email, password=body.password)
    return UserRead.model_validate(user)
