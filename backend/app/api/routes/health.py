"""Health check endpoint, used by humans, CI and container orchestrators."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    """Report that the API process is up and able to serve requests."""
    return {"status": "ok"}
