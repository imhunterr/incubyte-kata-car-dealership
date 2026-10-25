"""Authentication endpoints: registration and login.

Failures (duplicate e-mail, bad credentials) are raised by the service as
domain errors and turned into HTTP responses by :mod:`app.api.errors`.
"""

from fastapi import APIRouter, status

from app.api.deps import AuthServiceDep
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    responses={status.HTTP_409_CONFLICT: {"description": "Email is already registered"}},
)
def register(body: RegisterRequest, auth: AuthServiceDep) -> UserRead:
    """Create a new user account with the ``user`` role."""
    user = auth.register(email=body.email, password=body.password)
    return UserRead.model_validate(user)


@router.post(
    "/login",
    responses={status.HTTP_401_UNAUTHORIZED: {"description": "Invalid email or password"}},
)
def login(body: LoginRequest, auth: AuthServiceDep) -> TokenResponse:
    """Exchange an e-mail and password for a bearer access token."""
    result = auth.login(email=body.email, password=body.password)
    return TokenResponse(
        access_token=result.access_token, user=UserRead.model_validate(result.user)
    )
