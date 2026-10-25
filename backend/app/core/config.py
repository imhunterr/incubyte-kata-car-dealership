"""Application configuration, read from environment variables or a ``.env`` file."""

from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Typed runtime settings.

    Each field is populated from the environment variable of the same name
    (case-insensitive), falling back to the defaults below, which match the
    local ``docker compose`` database.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://dealership:dealership@localhost:5434/dealership"

    # Secret used to sign access tokens. The default is for local development
    # only; any shared or deployed environment must set JWT_SECRET_KEY.
    jwt_secret_key: str = "local-development-only-insecure-jwt-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # Extra browser origins allowed to call the API (CORS), e.g.
    # CORS_ORIGINS="https://app.example.com,https://admin.example.com".
    # Empty by default: in development the SPA uses the Vite proxy, which is
    # same-origin and needs no CORS.
    cors_origins: Annotated[list[str], NoDecode] = []

    @field_validator("database_url")
    @classmethod
    def _use_the_psycopg_driver(cls, url: str) -> str:
        """Point driver-less PostgreSQL URLs at psycopg 3.

        Hosted databases (Neon, Supabase, Vercel Postgres, ...) usually give
        ``postgres://`` or ``postgresql://`` URLs, which SQLAlchemy would open
        with psycopg2. This app installs psycopg 3, so name it explicitly.
        """
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url.removeprefix(prefix)
        return url

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_comma_separated(cls, value: object) -> object:
        """Accept a comma-separated string (from the environment) or a list."""
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide settings, created once on first use."""
    return Settings()
