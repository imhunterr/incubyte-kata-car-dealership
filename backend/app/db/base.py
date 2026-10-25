"""Declarative base shared by every ORM model."""

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

# Deterministic constraint names, so migrations can reliably refer to (and
# drop) constraints, instead of relying on database-generated names.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Base class for ORM models; its ``metadata`` is the schema Alembic migrates."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)
