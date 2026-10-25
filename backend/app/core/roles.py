"""User roles, shared by the persistence, security and API layers."""

from enum import StrEnum


class Role(StrEnum):
    """What a user is allowed to do.

    - ``USER``: browse, search and purchase vehicles.
    - ``ADMIN``: everything a user can do, plus manage the inventory
      (add, update, delete and restock vehicles).
    """

    USER = "user"
    ADMIN = "admin"
