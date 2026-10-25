"""Unit tests for password hashing in ``app.core.security``."""

from app.core.security import hash_password, verify_password


def test_hash_is_not_the_plain_password() -> None:
    assert hash_password("s3cret-password") != "s3cret-password"


def test_hash_uses_argon2() -> None:
    assert hash_password("s3cret-password").startswith("$argon2")


def test_hashing_the_same_password_twice_gives_different_hashes() -> None:
    # A random salt per hash means equal passwords never share a stored value.
    assert hash_password("s3cret-password") != hash_password("s3cret-password")


def test_verify_accepts_the_correct_password() -> None:
    password_hash = hash_password("s3cret-password")

    assert verify_password("s3cret-password", password_hash) is True


def test_verify_rejects_a_wrong_password() -> None:
    password_hash = hash_password("s3cret-password")

    assert verify_password("wrong-password", password_hash) is False
