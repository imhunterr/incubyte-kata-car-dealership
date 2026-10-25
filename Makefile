# Developer shortcuts. Run `make help` to list them.
#
# The backend runs on the host via uv; PostgreSQL runs in docker compose.

.DEFAULT_GOAL := help
.PHONY: help install db-up db-down migrate migrations-check seed dev-api dev-web \
        test test-backend test-frontend coverage lint format

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## Install backend and frontend dependencies
	cd backend && uv sync
	cd frontend && npm ci

db-up: ## Start PostgreSQL and wait until it is healthy
	docker compose up -d --wait db

db-down: ## Stop PostgreSQL (data is kept in a named volume)
	docker compose down

migrate: db-up ## Apply database migrations to the development database
	cd backend && uv run alembic upgrade head

# Runs against the TEST database, because it downgrades to an empty schema.
TEST_DATABASE_URL ?= postgresql+psycopg://dealership:dealership@localhost:5434/dealership_test

migrations-check: db-up ## Check migrations match the models and apply/revert cleanly (test DB)
	cd backend && DATABASE_URL=$(TEST_DATABASE_URL) uv run alembic upgrade head
	cd backend && DATABASE_URL=$(TEST_DATABASE_URL) uv run alembic check
	cd backend && DATABASE_URL=$(TEST_DATABASE_URL) uv run alembic downgrade base
	cd backend && DATABASE_URL=$(TEST_DATABASE_URL) uv run alembic upgrade head

seed: migrate ## Load sample vehicles into an empty development database
	cd backend && uv run python -m app.cli seed-demo

dev-api: migrate ## Run the API with auto-reload on http://localhost:8000
	cd backend && uv run uvicorn app.main:app --reload

dev-web: ## Run the SPA dev server on http://localhost:5173
	cd frontend && npm run dev

test: test-backend test-frontend ## Run every test suite

test-backend: db-up ## Run the backend tests
	cd backend && uv run pytest

test-frontend: ## Run the frontend tests
	cd frontend && npm test

coverage: db-up ## Run all tests with coverage reports
	cd backend && uv run pytest --cov --cov-report=term-missing --cov-report=html
	cd frontend && npm run test:coverage

lint: ## Lint, format-check and type-check both apps
	cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy
	cd frontend && npm run lint && npm run format:check && npm run typecheck

format: ## Auto-format both apps
	cd backend && uv run ruff check --fix . && uv run ruff format .
	cd frontend && npm run format
