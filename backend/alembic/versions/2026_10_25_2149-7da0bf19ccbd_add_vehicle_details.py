"""add vehicle details

Revision ID: 7da0bf19ccbd
Revises: cbcf1f8cce7a
Create Date: 2026-10-25 21:49:46.292834
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# Revision identifiers, used by Alembic.
revision: str = "7da0bf19ccbd"
down_revision: str | Sequence[str] | None = "cbcf1f8cce7a"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# Values given to vehicles that existed before these columns: the year the
# vehicle was added to the inventory, and neutral defaults for the rest.
# Admins can correct them through PUT /api/vehicles/{id}.
_BACKFILL = """
    UPDATE vehicles SET
        year = EXTRACT(YEAR FROM created_at)::int,
        fuel_type = 'petrol',
        transmission = 'manual',
        mileage_km = 0
"""


def upgrade() -> None:
    """Add the columns, fill them for existing rows, then make them required."""
    op.add_column("vehicles", sa.Column("year", sa.Integer(), nullable=True))
    op.add_column("vehicles", sa.Column("fuel_type", sa.String(length=20), nullable=True))
    op.add_column("vehicles", sa.Column("transmission", sa.String(length=20), nullable=True))
    op.add_column("vehicles", sa.Column("mileage_km", sa.Integer(), nullable=True))

    op.execute(_BACKFILL)

    for column in ("year", "fuel_type", "transmission", "mileage_km"):
        op.alter_column("vehicles", column, nullable=False)

    # Enum and range rules (names follow Base.metadata's naming convention).
    op.create_check_constraint(
        "fuel_type",
        "vehicles",
        "fuel_type IN ('petrol', 'diesel', 'cng', 'electric', 'hybrid')",
    )
    op.create_check_constraint(
        "transmission", "vehicles", "transmission IN ('manual', 'automatic')"
    )
    op.create_check_constraint("mileage_non_negative", "vehicles", "mileage_km >= 0")


def downgrade() -> None:
    """Remove the columns (their CHECK constraints are dropped with them)."""
    op.drop_column("vehicles", "mileage_km")
    op.drop_column("vehicles", "transmission")
    op.drop_column("vehicles", "fuel_type")
    op.drop_column("vehicles", "year")
