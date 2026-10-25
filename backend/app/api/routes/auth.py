"""Authentication endpoints: registration and login."""

from fastapi import APIRouter, HTTPException, status

from app.api.deps import AuthServiceDep
from app.core.errors import EmailAlreadyRegisteredError, InvalidCredentialsError
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    responses={status.HTTP_409_CONFLICT: {"description": "Email is already registered"}},
)
def register(body: RegisterRequest, auth: AuthServiceDep) -> UserRead:
    """Create a new user account with the ``user`` role."""
    try:
        user = auth.register(email=body.email, password=body.password)
    except EmailAlreadyRegisteredError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email is already registered"
        ) from error
    return UserRead.model_validate(user)


@router.post(
    "/login",
    responses={status.HTTP_401_UNAUTHORIZED: {"description": "Invalid email or password"}},
)
def login(body: LoginRequest, auth: AuthServiceDep) -> TokenResponse:
    """Exchange an e-mail and password for a bearer access token."""
    try:
        result = auth.login(email=body.email, password=body.password)
    except InvalidCredentialsError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error
    return TokenResponse(
        access_token=result.access_token, user=UserRead.model_validate(result.user)
    )
