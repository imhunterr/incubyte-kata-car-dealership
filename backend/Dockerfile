# FastAPI backend image.
#   docker build -t dealership-api backend/
# On start it applies database migrations, then serves on port 8000.

FROM python:3.13-slim

# uv, pinned to the version used for development.
COPY --from=ghcr.io/astral-sh/uv:0.13.0 /uv /bin/uv

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# Dependencies first, so code changes do not reinstall them.
COPY pyproject.toml uv.lock .python-version README.md ./
RUN uv sync --locked --no-dev --no-install-project

COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app
RUN uv sync --locked --no-dev

# Never run the API as root.
RUN useradd --create-home --uid 10001 appuser
USER appuser

EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers"]
