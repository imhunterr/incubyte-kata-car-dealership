# Car Dealership Inventory System — Specification

This document is the source of truth for **what** the system does. Every
behaviour listed under [Test list](#test-list) is written as a failing test
first, then implemented, then refactored (red → green → refactor).

---

## 1. Domain

### User

| Field           | Type    | Rules                                                     |
| --------------- | ------- | --------------------------------------------------------- |
| `id`            | int     | Server-generated, unique.                                 |
| `email`         | string  | Required, valid e-mail, unique (case-insensitive).        |
| `password`      | string  | Required on input, min 8 characters. Never returned.      |
| `password_hash` | string  | Argon2 hash. Stored only; plain passwords are never kept. |
| `role`          | enum    | `user` \| `admin`. Defaults to `user`.                    |

Registration **always** creates a `user`. Admins are created out-of-band with
a CLI command (`python -m app.cli create-admin`), so no API caller can grant
themselves admin rights.

### Vehicle

| Field      | Type    | Rules                                                                                      |
| ---------- | ------- | ------------------------------------------------------------------------------------------ |
| `id`       | int     | Server-generated, unique.                                                                  |
| `make`     | string  | Required, 1–50 chars, surrounding whitespace trimmed.                                      |
| `model`    | string  | Required, 1–50 chars, surrounding whitespace trimmed.                                      |
| `category` | enum    | One of `sedan`, `suv`, `hatchback`, `coupe`, `convertible`, `truck`, `van`, `wagon`.         |
| `price`    | decimal | Required, `> 0`, at most 2 decimal places, at most 10 digits. Serialised as a string.      |
| `quantity` | int     | Units in stock. Required, `>= 0`. The database also enforces `>= 0` (CHECK constraint).    |

---

## 2. Authentication & authorisation

- `POST /api/auth/login` returns a signed **JWT access token** (HS256).
  Claims: `sub` (user id), `role`, `exp`, `iat`. Default lifetime: 60 minutes.
- Protected endpoints read `Authorization: Bearer <token>`.
- **401 Unauthorized** — header missing, malformed, bad signature, expired, or
  the user no longer exists. Response carries `WWW-Authenticate: Bearer`.
- **403 Forbidden** — authenticated, but the role is not allowed.
- Role checks are enforced **on the server** for every route; the frontend only
  hides controls as a convenience.

---

## 3. API

All responses are JSON. Errors use FastAPI's shape: `{"detail": ...}`.

| Method | Path                           | Auth   | Success          | Errors                         |
| ------ | ------------------------------ | ------ | ---------------- | ------------------------------ |
| GET    | `/api/health`                  | —      | 200              |                                |
| POST   | `/api/auth/register`           | —      | 201 user         | 409 duplicate, 422 invalid     |
| POST   | `/api/auth/login`              | —      | 200 token + user | 401 bad credentials, 422       |
| GET    | `/api/auth/me`                 | user   | 200 user         | 401                            |
| POST   | `/api/vehicles`                | admin  | 201 vehicle      | 401, 403, 422                  |
| GET    | `/api/vehicles`                | user   | 200 list         | 401                            |
| GET    | `/api/vehicles/search`         | user   | 200 list         | 401, 422                       |
| PUT    | `/api/vehicles/{id}`           | admin  | 200 vehicle      | 401, 403, 404, 422             |
| DELETE | `/api/vehicles/{id}`           | admin  | 204              | 401, 403, 404                  |
| POST   | `/api/vehicles/{id}/purchase`  | user   | 200 vehicle      | 401, 404, 409 out of stock     |
| POST   | `/api/vehicles/{id}/restock`   | admin  | 200 vehicle      | 401, 403, 404, 422             |

"user" means any authenticated user (both roles). "admin" means role `admin` only.

### Notes

- **Register** — body `{email, password}`; returns `{id, email, role}`.
- **Login** — body `{email, password}`; returns
  `{access_token, token_type: "bearer", user: {id, email, role}}`. An unknown
  e-mail and a wrong password give the **same** 401 message, so callers cannot
  probe which e-mails are registered.
- **Me** — returns the authenticated user `{id, email, role}`; lets the SPA
  confirm a stored token is still valid.
- **List** — returns every vehicle, including ones with `quantity = 0` (the UI
  shows them with a disabled Purchase button). Ordered by `id`.
- **Search** — query params, all optional and combinable (AND):
  - `make`, `model`: case-insensitive *partial* match.
  - `category`: exact match on the enum.
  - `min_price`, `max_price`: inclusive bounds, each `>= 0`.
  - `min_price > max_price` → 422.
  - No params → same result as list.
- **Update** — full replacement (`PUT`) of `make`, `model`, `category`,
  `price`, `quantity`, with the same validation as create.
- **Purchase** — decreases `quantity` by exactly 1. Done as a single atomic
  `UPDATE … SET quantity = quantity - 1 WHERE id = :id AND quantity > 0`, so
  concurrent purchases can never oversell or drive stock negative. If no row
  is updated: 404 if the vehicle does not exist, otherwise 409.
- **Restock** — body `{quantity}` with `quantity >= 1`; increases stock by
  that amount, atomically.

---

## 4. Frontend (React + TypeScript + Tailwind SPA)

- Register and login forms with inline validation errors.
- Dashboard listing all vehicles (make, model, category, price, stock).
- Search and filter by make, model, category and price range.
- A **Purchase** button on each vehicle, disabled when `quantity` is 0.
- Admin-only UI: add, edit, delete and restock vehicles.
- Responsive layout. Accessible labels on every form control.
- Logged-out users are redirected to login. A 401 from the API logs the user
  out.

---

## Test list

Tests are grouped by slice, in the order they are built. `[x]` = done.

### Slice 0 — Health

- [x] `GET /api/health` returns 200 `{"status": "ok"}`.
- [x] Health reports the database as reachable (503 when it is not).

### Slice 1 — Auth

Register
- [ ] Valid e-mail + password → 201 with `id`, `email`, `role = "user"`.
- [ ] Response never includes the password or its hash.
- [ ] Password is stored hashed (stored value ≠ plain text, verifies with Argon2).
- [ ] Duplicate e-mail → 409.
- [ ] Duplicate e-mail with different letter case → 409.
- [ ] Invalid e-mail → 422.
- [ ] Password shorter than 8 characters → 422.
- [ ] Missing fields → 422.
- [ ] A `role` sent in the body is ignored (still `user`).

Login
- [ ] Correct credentials → 200 with bearer token and user.
- [ ] Token decodes to the right `sub` and `role`, and has an `exp`.
- [ ] Wrong password → 401.
- [ ] Unknown e-mail → 401 with the same message as a wrong password.
- [ ] E-mail match is case-insensitive.

Token guard (exercised through `GET /api/auth/me` and an admin-only route)
- [ ] Valid token → 200 with the current user.
- [ ] No `Authorization` header → 401.
- [ ] Malformed header (not `Bearer …`) → 401.
- [ ] Token signed with another key → 401.
- [ ] Expired token → 401.
- [ ] Token for a deleted user → 401.
- [ ] Non-admin on an admin route → 403; admin → allowed.
- [ ] Role is read from the database, so a demoted admin's old token no longer grants admin.

Security unit tests
- [ ] `hash_password` / `verify_password` round-trip; wrong password fails.
- [ ] `create_access_token` / `decode_access_token` round-trip.

Admin CLI
- [ ] `create-admin` creates a user with role `admin`.
- [ ] `create-admin` promotes an existing user to `admin`.

### Slice 2 — Vehicles CRUD

Create (admin)
- [ ] Valid body → 201 with generated `id`.
- [ ] Non-admin → 403; anonymous → 401.
- [ ] Missing field → 422 (one case per field).
- [ ] `price <= 0` → 422; more than 2 decimal places → 422.
- [ ] `quantity < 0` → 422; non-integer quantity → 422.
- [ ] Unknown category → 422.
- [ ] Blank / whitespace-only make or model → 422; values are trimmed.

List
- [ ] Empty database → 200 `[]`.
- [ ] Returns all vehicles ordered by `id`, including zero-stock ones.
- [ ] Anonymous → 401.

Update (admin)
- [ ] Valid body → 200 with updated fields; change is persisted.
- [ ] Unknown id → 404.
- [ ] Same validation rules as create → 422.
- [ ] Non-admin → 403.

Delete (admin)
- [ ] Existing id → 204; the vehicle is gone afterwards.
- [ ] Unknown id → 404.
- [ ] Non-admin → 403; anonymous → 401.

### Slice 3 — Search

- [ ] No params → every vehicle.
- [ ] `make` partial, case-insensitive match.
- [ ] `model` partial, case-insensitive match.
- [ ] `category` exact match; unknown category → 422.
- [ ] `min_price` only; `max_price` only; both (inclusive bounds).
- [ ] `min_price > max_price` → 422; negative price → 422.
- [ ] Combined filters are ANDed.
- [ ] No matches → 200 `[]`.
- [ ] Anonymous → 401.

### Slice 4 — Inventory

Purchase (any user)
- [ ] In stock → 200; quantity decreases by 1; change is persisted.
- [ ] Last unit → quantity becomes 0.
- [ ] Out of stock → 409; quantity stays 0.
- [ ] Unknown id → 404.
- [ ] Anonymous → 401.
- [ ] **Concurrency:** N parallel purchases with stock 1 → exactly one 200,
      N−1 409s, final quantity 0.

Restock (admin)
- [ ] Valid quantity → 200; stock increases by that amount.
- [ ] `quantity <= 0` or missing → 422.
- [ ] Unknown id → 404.
- [ ] Non-admin → 403; anonymous → 401.

### Slice 5 — Frontend

- [ ] Login form: submits credentials, stores the session, redirects to the dashboard.
- [ ] Login form: shows the API error on 401.
- [ ] Register form: validates e-mail and password length before submitting.
- [ ] Protected route redirects anonymous users to login.
- [ ] Dashboard lists vehicles from the API.
- [ ] Purchase button disabled when quantity is 0; enabled otherwise.
- [ ] Clicking Purchase calls the API and updates the shown stock.
- [ ] Search form sends the right query params.
- [ ] Admin controls hidden for regular users, shown for admins.
- [ ] Admin can add, edit, delete and restock vehicles through forms.
- [ ] A 401 from any API call logs the user out.
