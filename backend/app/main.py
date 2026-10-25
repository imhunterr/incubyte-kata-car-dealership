"""FastAPI application factory and the ASGI entry point (``app.main:app``)."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import register_error_handlers
from app.api.routes import auth, health, vehicles
from app.core.config import Settings, get_settings


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build and configure a new FastAPI application.

    A factory (rather than a module-level singleton only) lets tests create an
    isolated app instance, with its own settings, and override its
    dependencies without side effects.

    Args:
        settings: Configuration to build the app with. Defaults to the
            process-wide settings read from the environment.
    """
    settings = settings or get_settings()
    app = FastAPI(
        title="Car Dealership Inventory API",
        version="0.1.0",
    )
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_methods=["*"],
            # Authorization carries the bearer token; Content-Type the JSON body.
            allow_headers=["Authorization", "Content-Type"],
        )
    register_error_handlers(app)
    app.include_router(health.router, prefix="/api")
    app.include_router(auth.router, prefix="/api")
    app.include_router(vehicles.router, prefix="/api")
    return app


app = create_app()
