"""Application configuration, read from environment variables or a ``.env`` file."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed runtime settings.

    Each field is populated from the environment variable of the same name
    (case-insensitive), falling back to the defaults below, which match the
    local ``docker compose`` database.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://dealership:dealership@localhost:5434/dealership"


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide settings, created once on first use."""
    return Settings()
