"""Car Dealership Inventory System — REST API.

Layering, from the outside in:

- ``app.api``          HTTP routers and request dependencies (thin; no business rules).
- ``app.services``     Business rules (e.g. purchase/restock invariants, auth flows).
- ``app.repositories`` All database access (SQL lives here and nowhere else).
- ``app.models``       SQLAlchemy ORM models.
- ``app.schemas``      Pydantic request/response models (the API contract).
- ``app.core``         Cross-cutting concerns: configuration, security, errors.
- ``app.db``           Engine and session management.
"""
