# Car Dealership Inventory System

A full-stack inventory system for a car dealership, built test-first
(red → green → refactor).

- **Backend:** FastAPI · SQLAlchemy 2 · Alembic · PostgreSQL · JWT auth
- **Frontend:** React · TypeScript · Vite · Tailwind CSS
- **Tests:** pytest (against a real PostgreSQL database) · Vitest + Testing Library

The behaviour the system implements, and the test list that drives it, is in
[docs/SPEC.md](docs/SPEC.md).

> Work in progress. Screenshots, the full feature tour and the "My AI Usage"
> section will be added as the project is completed.

## Prerequisites

- [uv](https://docs.astral.sh/uv/) (installs Python 3.13 automatically)
- Node.js 24+ and npm
- Docker with Docker Compose

## Quick start

```bash
make install    # backend (uv sync) + frontend (npm ci) dependencies
make db-up      # start PostgreSQL on localhost:5434
make test       # run the backend and frontend test suites
```

Run the app locally (two terminals):

```bash
make dev-api    # applies migrations, then serves the API on http://localhost:8000
make dev-web    # serves the SPA on http://localhost:5173 (proxies /api to the API)
```

Run `make help` to see every available task.

### Creating an admin

Registration through the API always creates a regular user, so nobody can
grant themselves admin rights. Admins are created, or existing users promoted,
from the command line:

```bash
cd backend
uv run python -m app.cli create-admin --email admin@example.com   # prompts for a password
```

## Configuration

The backend reads its settings from environment variables or `backend/.env`
(see [backend/.env.example](backend/.env.example)). The defaults match the
`docker compose` database, so no configuration is needed for local use.

| Variable                      | Purpose                                                                |
| ----------------------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`                | Database used by the running API.                                      |
| `TEST_DATABASE_URL`           | Database used by the test suite (recreated).                           |
| `JWT_SECRET_KEY`              | Signs access tokens. **Set a strong value outside local development.** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime (default `60`).                                  |
| `DB_PORT`                     | Host port for the compose PostgreSQL (`5434`).                         |
| `VITE_API_PROXY`              | API URL the Vite dev server proxies `/api` to.                         |

## Design decisions

- **Inventory changes are admin-only.** The brief marks only `DELETE` and
  `restock` as admin-only, but reserves the add/update UI for admins. The API
  enforces the same rule server-side for `POST` and `PUT /api/vehicles`, so a
  regular user cannot change prices or stock by calling the API directly.
- **Roles are read from the database on every request**, not trusted from the
  token, so demoting or deleting a user takes effect immediately.
- **Login failures are indistinguishable.** An unknown e-mail and a wrong
  password return the same 401, and take comparable time, so the endpoint
  cannot be used to discover registered e-mails.
- **E-mails are case-insensitive** (normalised to lower case), and the
  database's unique constraint is the single, race-safe guard against
  duplicates.

## Project layout

```
backend/            FastAPI application
  app/api/          routers and request dependencies (thin)
  app/services/     business rules
  app/repositories/ database access
  app/models/       SQLAlchemy models
  app/schemas/      request/response models
  app/core/         configuration and security
  alembic/          database migrations
  tests/            pytest suite
frontend/           React single-page application
docs/SPEC.md        specification and test list
PROMPTS.md          raw log of the prompts given to the AI assistant
```
