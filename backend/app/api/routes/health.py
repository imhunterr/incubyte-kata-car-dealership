"""Health check endpoint, used by humans, CI and container orchestrators."""

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.deps import SessionDep

router = APIRouter(tags=["health"])


@router.get("/health", response_model=None)
def health(session: SessionDep) -> dict[str, str] | JSONResponse:
    """Report whether the API is up and can reach its database.

    Returns 200 when healthy, or 503 when the database cannot be queried, so a
    load balancer or orchestrator can stop routing traffic to this instance.
    """
    try:
        session.execute(text("SELECT 1"))
    except SQLAlchemyError:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unavailable", "database": "unreachable"},
        )
    return {"status": "ok", "database": "ok"}
