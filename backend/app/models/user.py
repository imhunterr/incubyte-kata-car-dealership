"""The ``users`` table: people who can log in to the dealership app."""

from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.roles import Role
from app.db.base import Base
from app.db.types import string_enum


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
        string_enum(Role, name="user_role"),
        default=Role.USER,
        server_default=Role.USER.value,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
