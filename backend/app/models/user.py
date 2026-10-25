"""The ``users`` table: people who can log in to the dealership app."""

from datetime import datetime

from sqlalchemy import DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.roles import Role
from app.db.base import Base


class User(Base):
    """A registered account.

    Only a password *hash* is stored; the plain password never reaches the
    database.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    # 320 characters is the maximum length of a valid e-mail address.
    email: Mapped[str] = mapped_column(String(320), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(
        # Stored as a short string with a CHECK constraint rather than a native
        # PostgreSQL enum, so adding a role later is a simple migration.
        Enum(
            Role,
            name="user_role",
            native_enum=False,
            create_constraint=True,
            length=20,
            values_callable=lambda roles: [role.value for role in roles],
        ),
        default=Role.USER,
        server_default=Role.USER.value,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
