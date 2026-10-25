"""FastAPI application factory and the ASGI entry point (``app.main:app``)."""

from fastapi import FastAPI

from app.api.routes import health


def create_app() -> FastAPI:
    """Build and configure a new FastAPI application.

    A factory (rather than a module-level singleton only) lets tests create an
    isolated app instance and override its dependencies without side effects.
    """
    app = FastAPI(
        title="Car Dealership Inventory API",
        version="0.1.0",
    )
    app.include_router(health.router, prefix="/api")
    return app


app = create_app()
