"""Reusable column types."""

from enum import StrEnum

from sqlalchemy import Enum


def string_enum(enum_class: type[StrEnum], name: str) -> Enum:
    """A column type that stores a ``StrEnum``'s *values* as short strings.

    Uses a VARCHAR plus a CHECK constraint rather than a native PostgreSQL
    enum, so adding a member later is a simple migration instead of an
    ``ALTER TYPE``. Values (``"admin"``), not names (``"ADMIN"``), are stored.
    """
    return Enum(
        enum_class,
        name=name,
        native_enum=False,
        create_constraint=True,
        length=20,
        values_callable=lambda members: [member.value for member in members],
    )
