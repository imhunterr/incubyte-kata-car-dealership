"""Security primitives: password hashing.

Passwords are hashed with Argon2 (via ``pwdlib``), the winner of the Password
Hashing Competition and the current OWASP recommendation. Each hash embeds its
own random salt and cost parameters, so only the hash string needs storing.
"""

from pwdlib import PasswordHash

_password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    """Return a salted Argon2 hash of ``password``, safe to store."""
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Return ``True`` if ``password`` matches the stored ``password_hash``."""
    return _password_hasher.verify(password, password_hash)
