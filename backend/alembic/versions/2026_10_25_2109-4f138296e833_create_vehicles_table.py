"""create vehicles table

Revision ID: 4f138296e833
Revises: 09bbf743a3d0
Create Date: 2026-10-25 21:09:30.227551
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# Revision identifiers, used by Alembic.
revision: str = "4f138296e833"
down_revision: str | Sequence[str] | None = "09bbf743a3d0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "vehicles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("make", sa.String(length=50), nullable=False),
        sa.Column("model", sa.String(length=50), nullable=False),
        sa.Column(
            "category",
            sa.Enum(
                "sedan",
                "suv",
                "hatchback",
                "coupe",
                "convertible",
                "truck",
                "van",
                "wagon",
                name="vehicle_category",
                native_enum=False,
                create_constraint=True,
                length=20,
            ),
            nullable=False,
        ),
        sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_vehicles")),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("vehicles")
