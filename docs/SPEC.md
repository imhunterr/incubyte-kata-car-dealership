# Car Dealership Inventory System — Specification

This document is the source of truth for **what** the system does. Every
behaviour listed under [Test list](#test-list) is written as a failing test
first, then implemented, then refactored (red → green → refactor).

---

## 1. Domain

### User

| Field           | Type   | Rules                                                     |
| --------------- | ------ | --------------------------------------------------------- |
| `id`            | int    | Server-generated, unique.                                 |
| `email`         | string | Required, valid e-mail, unique (case-insensitive).        |
| `password`      | string | Required on input, min 8 characters. Never returned.      |
| `password_hash` | string | Argon2 hash. Stored only; plain passwords are never kept. |
| `role`          | enum   | `user` \| `admin`. Defaults to `user`.                    |

Registration **always** creates a `user`. Admins are created out-of-band with
a CLI command (`python -m app.cli create-admin`), so no API caller can grant
themselves admin rights.

### Vehicle

| Field          | Type    | Rules                                                                                   |
| -------------- | ------- | --------------------------------------------------------------------------------------- |
| `id`           | int     | Server-generated, unique.                                                               |
| `make`         | string  | Required, 1–50 chars, surrounding whitespace trimmed.                                   |
| `model`        | string  | Required, 1–50 chars, surrounding whitespace trimmed.                                   |
| `category`     | enum    | One of `sedan`, `suv`, `hatchback`, `coupe`, `convertible`, `truck`, `van`, `wagon`.    |
| `price`        | decimal | Required, `> 0`, at most 2 decimal places, at most 10 digits. Serialised as a string.   |
| `quantity`     | int     | Units in stock. Required, `>= 0`. The database also enforces `>= 0` (CHECK constraint). |
| `year`         | int     | Model year. Required, from 1990 to next calendar year.                                  |
| `fuel_type`    | enum    | One of `petrol`, `diesel`, `cng`, `electric`, `hybrid`.                                 |
| `transmission` | enum    | `manual` or `automatic`.                                                                |
| `mileage_km`   | int     | Kilometres driven. Required, 0–1,000,000. The database enforces `>= 0`.                 |

The brief requires `id`, `make`, `model`, `category`, `price` and `quantity`.
`year`, `fuel_type`, `transmission` and `mileage_km` were added so buyers can
compare used cars on the details that matter most to them.

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

| Method | Path                          | Auth  | Success          | Errors                     |
| ------ | ----------------------------- | ----- | ---------------- | -------------------------- |
| GET    | `/api/health`                 | —     | 200              |                            |
| POST   | `/api/auth/register`          | —     | 201 user         | 409 duplicate, 422 invalid |
| POST   | `/api/auth/login`             | —     | 200 token + user | 401 bad credentials, 422   |
| GET    | `/api/auth/me`                | user  | 200 user         | 401                        |
| POST   | `/api/vehicles`               | admin | 201 vehicle      | 401, 403, 422              |
| GET    | `/api/vehicles`               | user  | 200 list         | 401                        |
| GET    | `/api/vehicles/search`        | user  | 200 list         | 401, 422                   |
| PUT    | `/api/vehicles/{id}`          | admin | 200 vehicle      | 401, 403, 404, 422         |
| DELETE | `/api/vehicles/{id}`          | admin | 204              | 401, 403, 404              |
| POST   | `/api/vehicles/{id}/purchase` | user  | 200 vehicle      | 401, 404, 409 out of stock |
| POST   | `/api/vehicles/{id}/restock`  | admin | 200 vehicle      | 401, 403, 404, 422         |

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
  - `make`, `model`: case-insensitive _partial_ match (trimmed; blank = no
    filter; `%` and `_` are matched literally).
  - `category`: exact match on the enum.
  - `min_price`, `max_price`: inclusive bounds, each `>= 0`.
  - `min_price > max_price` → 422.
  - `fuel_type`, `transmission`: exact match on the enum.
  - `min_year`: model year `>=` this value.
  - `max_mileage`: `mileage_km <=` this value (`>= 0`).
  - No params → same result as list.
- **Update** — full replacement (`PUT`) of every editable field, with the same
  validation as create.
- **Purchase** — decreases `quantity` by exactly 1. Done as a single atomic
  `UPDATE … SET quantity = quantity - 1 WHERE id = :id AND quantity > 0`, so
  concurrent purchases can never oversell or drive stock negative. If no row
  is updated: 404 if the vehicle does not exist, otherwise 409.
- **Restock** — body `{quantity}` with `1 <= quantity <= 10,000` (a strict
  integer); increases stock by that amount with one atomic
  `UPDATE … SET quantity = quantity + :n`.

---

## 4. Frontend (React + TypeScript + Tailwind SPA)

- Register and login forms with inline validation errors.
- Dashboard listing all vehicles as cards: make, model, category, price,
  year, mileage, fuel, transmission, stock (with a low-stock badge), and an
  illustration of the body type.
- Search and filter by make, model, category, price range, fuel type,
  transmission, minimum year and maximum mileage, in a filter panel.
- Quick filters: body-type and brand shortcuts and price-range presets.
- Active filters are shown as removable chips; results can be sorted (price,
  year, mileage).
- Shortlist: users can save vehicles (kept in the browser, per user) and view
  only their saved vehicles.
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

- [x] Valid e-mail + password → 201 with `id`, `email`, `role = "user"`.
- [x] Response never includes the password or its hash.
- [x] Password is stored hashed (stored value ≠ plain text, verifies with Argon2).
- [x] Duplicate e-mail → 409.
- [x] Duplicate e-mail with different letter case → 409.
- [x] Invalid e-mail → 422.
- [x] Password shorter than 8 characters → 422.
- [x] Missing fields → 422.
- [x] A `role` sent in the body is ignored (still `user`).

Login

- [x] Correct credentials → 200 with bearer token and user.
- [x] Token decodes to the right `sub` and `role`, and has an `exp`.
- [x] Wrong password → 401.
- [x] Unknown e-mail → 401 with the same message as a wrong password.
- [x] E-mail match is case-insensitive.

Token guard (exercised through `GET /api/auth/me` and an admin-only route)

- [x] Valid token → 200 with the current user.
- [x] No `Authorization` header → 401.
- [x] Malformed header (not `Bearer …`) → 401.
- [x] Token signed with another key → 401.
- [x] Expired token → 401.
- [x] Token for a deleted user → 401.
- [x] Non-admin on an admin route → 403; admin → allowed.
- [x] Role is read from the database, so a demoted admin's old token no longer grants admin.

Security unit tests

- [x] `hash_password` / `verify_password` round-trip; wrong password fails.
- [x] `create_access_token` / `decode_access_token` round-trip.

Admin CLI

- [x] `create-admin` creates a user with role `admin`.
- [x] `create-admin` promotes an existing user to `admin`.

### Slice 2 — Vehicles CRUD

Create (admin)

- [x] Valid body → 201 with generated `id`.
- [x] Non-admin → 403; anonymous → 401.
- [x] Missing field → 422 (one case per field).
- [x] `price <= 0` → 422; more than 2 decimal places → 422.
- [x] `quantity < 0` → 422; non-integer quantity → 422.
- [x] Unknown category → 422.
- [x] Blank / whitespace-only make or model → 422; values are trimmed.
- [x] Quantity must be a JSON integer: `"3"`, `2.5` and `true` → 422.
- [x] The database itself rejects `quantity < 0` and `price <= 0` (CHECK constraints).

List

- [x] Empty database → 200 `[]`.
- [x] Returns all vehicles ordered by `id`, including zero-stock ones.
- [x] Anonymous → 401.

Update (admin)

- [x] Valid body → 200 with updated fields; change is persisted.
- [x] Unknown id → 404.
- [x] Same validation rules as create → 422.
- [x] Non-admin → 403.

Delete (admin)

- [x] Existing id → 204; the vehicle is gone afterwards.
- [x] Unknown id → 404.
- [x] Non-admin → 403; anonymous → 401.

### Slice 3 — Search

- [x] No params → every vehicle.
- [x] `make` partial, case-insensitive match.
- [x] `model` partial, case-insensitive match.
- [x] Text filters are trimmed; blank text filters are ignored.
- [x] `%`, `_` and `\` in text filters match literally (not as SQL wildcards).
- [x] `category` exact match; unknown category → 422.
- [x] `min_price` only; `max_price` only; both (inclusive bounds).
- [x] `min_price > max_price` → 422; negative price → 422.
- [x] Combined filters are ANDed.
- [x] No matches → 200 `[]`.
- [x] Anonymous → 401.

### Slice 4 — Inventory

Purchase (any user)

- [x] In stock → 200; quantity decreases by 1; change is persisted.
- [x] Last unit → quantity becomes 0.
- [x] Out of stock → 409; quantity stays 0.
- [x] Unknown id → 404.
- [x] Anonymous → 401.
- [x] **Concurrency:** N parallel purchases with stock 1 → exactly one 200,
      N−1 409s, final quantity 0.

Restock (admin)

- [x] Valid quantity → 200; stock increases by that amount.
- [x] `quantity <= 0`, over 10,000, non-integer or missing → 422; stock unchanged.
- [x] Restocking a sold-out vehicle makes it purchasable again.
- [x] **Concurrency:** simultaneous restocks are all counted (no lost updates).
- [x] Unknown id → 404.
- [x] Non-admin → 403; anonymous → 401.

### API polish

- [x] CORS: only origins listed in `CORS_ORIGINS` are allowed; none by default.
- [x] Every operation in the OpenAPI schema is either public (health,
      register, login) or returns 401 anonymously; exactly the admin
      operations return 403 to regular users.
- [x] `seed-demo` fills an empty inventory (every category, one sold out) and
      never touches a non-empty one.
- [x] Migrations match the models and can be applied, reverted and re-applied
      (CI and `make migrations-check`).

### Slice 4b — Richer vehicle data

- [ ] Create/update/read include `year`, `fuel_type`, `transmission`, `mileage_km`.
- [ ] Each new field is required on create and update → 422 when missing.
- [ ] `year` outside 1990..next year, unknown fuel type or transmission,
      mileage outside 0..1,000,000 or non-integer → 422.
- [ ] Existing vehicles get sensible values from the migration.
- [ ] The database rejects negative mileage (CHECK constraint).
- [ ] Search by `fuel_type`, `transmission`, `min_year`, `max_mileage`,
      combined with the other filters; invalid values → 422.
- [ ] Demo data covers every fuel type and both transmissions.

### Slice 5 — Frontend

- [x] Login form: submits credentials, stores the session, redirects to the dashboard.
- [x] Login form: shows the API error on 401.
- [x] Register form: validates e-mail and password length before submitting.
- [x] Protected route redirects anonymous users to login.
- [ ] Dashboard lists vehicles from the API.
- [ ] Purchase button disabled when quantity is 0; enabled otherwise.
- [ ] Clicking Purchase calls the API and updates the shown stock.
- [ ] Search form sends the right query params.
- [ ] Cards show year, mileage, fuel, transmission and a low-stock badge.
- [ ] Filter panel covers fuel type, transmission, minimum year and maximum mileage.
- [ ] Quick filters (body type, brand, price preset) apply in one click.
- [ ] Active filters appear as chips; removing a chip re-runs the search.
- [ ] Results can be sorted by price, year and mileage.
- [ ] Shortlist: save/unsave from a card, persisted per user, and a
      "Shortlisted" view.
- [ ] Admin controls hidden for regular users, shown for admins.
- [ ] Admin can add, edit, delete and restock vehicles through forms.
- [x] A 401 from any API call logs the user out.
- [x] Register form: confirmation must match; the new user is logged in straight away.
- [x] Logged-in users are kept off the login/register pages; the header shows
      the user, an Admin badge and Log out.
