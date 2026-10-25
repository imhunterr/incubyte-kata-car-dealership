# Car Dealership Inventory System

A full-stack inventory system for a car dealership, built test-first
(red → green → refactor).

- **Backend:** FastAPI · SQLAlchemy 2 · Alembic · PostgreSQL · JWT auth
- **Frontend:** React · TypeScript · Vite · Tailwind CSS
- **Tests:** pytest (against a real PostgreSQL database) · Vitest + Testing Library

## Features

- **Accounts:** register and log in; JWT-secured API; admins are created from
  the command line.
- **Browse:** every vehicle as a card with a body-type illustration, price,
  year, mileage, fuel, transmission, stock and an "Only N left" badge.
- **Search and filter:** make, model, body type, budget, fuel type,
  transmission, model year and mileage, plus one-click body-type, brand and
  budget shortcuts. Applied filters show as removable chips.
- **Sort** by price, year or mileage.
- **Shortlist** vehicles to compare later (saved per user in the browser).
- **Purchase** in one click; the button is disabled when a vehicle is sold
  out, and stock can never be oversold, even under concurrent purchases.
- **Admin:** add, edit, delete (with confirmation) and restock vehicles from
  accessible dialogs; the API enforces the same admin-only rules.
- **Responsive** navy-and-amber design with accessible labels throughout.

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

Run `make help` to see every available task. Interactive API docs (Swagger UI)
are served at http://localhost:8000/docs while the API is running.

### Demo data

```bash
make seed       # adds 12 sample vehicles, only if the inventory is empty
```

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

| Variable                      | Purpose                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `DATABASE_URL`                | Database used by the running API.                                                 |
| `TEST_DATABASE_URL`           | Database used by the test suite (recreated).                                      |
| `JWT_SECRET_KEY`              | Signs access tokens. **Set a strong value outside local development.**            |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime (default `60`).                                             |
| `CORS_ORIGINS`                | Extra browser origins allowed to call the API, comma-separated (none by default). |
| `DB_PORT`                     | Host port for the compose PostgreSQL (`5434`).                                    |
| `VITE_API_PROXY`              | API URL the Vite dev server proxies `/api` to.                                    |

## Deploying to Vercel

[`vercel.json`](vercel.json) deploys the SPA and the API as two Vercel
services: `/api/*` goes to FastAPI (`backend/app/main.py`), everything else to
the Vite build.

1. Create a hosted PostgreSQL database (e.g. Neon, Supabase or Vercel
   Postgres). Its `postgres://…` URL can be used as-is.
2. In the Vercel project, set these environment variables:
   - `DATABASE_URL`: the hosted database URL.
   - `JWT_SECRET_KEY`: a long random string, e.g. from
     `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
3. Prepare the database once, from your machine:

   ```bash
   cd backend
   export DATABASE_URL='postgres://…'               # the hosted database
   uv run alembic upgrade head                      # create the tables
   uv run python -m app.cli create-admin --email you@example.com
   uv run python -m app.cli seed-demo               # optional sample inventory
   ```

4. Deploy, then check `https://<your-app>/api/health` reports
   `{"status": "ok", "database": "ok"}`.

Run `alembic upgrade head` again whenever a new migration is added.

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
- **Stock changes are atomic.** A purchase is one conditional
  `UPDATE … SET quantity = quantity - 1 WHERE id = :id AND quantity > 0`, and a
  restock is one `SET quantity = quantity + :n`. A test fires 10 simultaneous
  purchases at a vehicle with fewer units and checks that exactly as many
  succeed as there were units, with the rest getting 409. The first,
  read-then-write version failed that test (10 sales from 3 units), which is
  why the atomic version exists.
- **Richer vehicle data.** Besides the required make, model, category, price
  and quantity, vehicles record model year, fuel type, transmission and
  mileage, which buyers can also filter on. The migration that added them
  fills in values for existing rows before making the columns required.
- **Money is exact.** Prices are `Decimal` values in a `NUMERIC(10, 2)` column
  and are sent over JSON as strings (`"21999.99"`), so no floating-point
  rounding ever touches them.
- **Invariants are enforced twice.** The API validates input, and the
  database has CHECK constraints (`quantity >= 0`, `price > 0`) so no code
  path can store impossible stock or prices.
- **Search input is never treated as a pattern.** `make`/`model` filters use
  `ILIKE` with `%`, `_` and `\` escaped, so a search for `%` finds nothing
  instead of everything.
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
