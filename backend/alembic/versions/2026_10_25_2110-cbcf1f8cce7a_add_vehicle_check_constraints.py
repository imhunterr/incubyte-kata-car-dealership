"""add vehicle check constraints

Revision ID: cbcf1f8cce7a
Revises: 4f138296e833
Create Date: 2026-10-25 21:10:39.894916
"""

from collections.abc import Sequence

from alembic import op

# Revision identifiers, used by Alembic.
revision: str = "cbcf1f8cce7a"
down_revision: str | Sequence[str] | None = "4f138296e833"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# Alembic's autogenerate does not detect CHECK constraints, so these are
# written by hand. Names follow Base.metadata's naming convention.


def upgrade() -> None:
    """Upgrade schema."""
    op.create_check_constraint("quantity_non_negative", "vehicles", "quantity >= 0")
    op.create_check_constraint("price_positive", "vehicles", "price > 0")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(op.f("ck_vehicles_price_positive"), "vehicles", type_="check")
    op.drop_constraint(op.f("ck_vehicles_quantity_non_negative"), "vehicles", type_="check")
