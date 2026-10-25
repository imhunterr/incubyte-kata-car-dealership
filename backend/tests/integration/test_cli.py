"""Tests for the admin command-line tool, ``python -m app.cli``."""

from collections.abc import Callable

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker

from app.cli import main
from app.core.categories import FuelType, Transmission, VehicleCategory
from app.core.roles import Role
from app.core.security import verify_password
from app.models.user import User
from app.models.vehicle import Vehicle
from tests.helpers import DEFAULT_PASSWORD


def _user(db_session: Session, email: str) -> User | None:
    db_session.expire_all()  # see changes committed by the CLI's own session
    return db_session.scalars(select(User).where(User.email == email)).one_or_none()


def _user_count(db_session: Session) -> int:
    return db_session.scalar(select(func.count()).select_from(User)) or 0


def _no_prompt(prompt: str) -> str:
    raise AssertionError(f"Unexpected password prompt: {prompt!r}")


def test_create_admin_creates_a_new_admin_account(
    session_factory: sessionmaker[Session], db_session: Session, capsys: pytest.CaptureFixture[str]
) -> None:
    exit_code = main(
        ["create-admin", "--email", "boss@example.com", "--password", "s3cure-admin-pw"],
        session_factory=session_factory,
        read_password=_no_prompt,
    )

    assert exit_code == 0
    admin = _user(db_session, "boss@example.com")
    assert admin is not None
    assert admin.role is Role.ADMIN
    assert verify_password("s3cure-admin-pw", admin.password_hash)
    assert "Created admin boss@example.com" in capsys.readouterr().out


def test_create_admin_prompts_for_the_password_when_not_given(
    session_factory: sessionmaker[Session], db_session: Session
) -> None:
    prompts: list[str] = []

    def read_password(prompt: str) -> str:
        prompts.append(prompt)
        return "typed-at-the-prompt"

    exit_code = main(
        ["create-admin", "--email", "boss@example.com"],
        session_factory=session_factory,
        read_password=read_password,
    )

    assert exit_code == 0
    assert len(prompts) == 1
    admin = _user(db_session, "boss@example.com")
    assert admin is not None
    assert verify_password("typed-at-the-prompt", admin.password_hash)


def test_create_admin_normalises_the_email(
    session_factory: sessionmaker[Session], db_session: Session
) -> None:
    main(
        ["create-admin", "--email", "Boss@Example.COM", "--password", "s3cure-admin-pw"],
        session_factory=session_factory,
        read_password=_no_prompt,
    )

    assert _user(db_session, "boss@example.com") is not None


def test_create_admin_promotes_an_existing_user_and_keeps_their_password(
    session_factory: sessionmaker[Session],
    db_session: Session,
    create_user: Callable[..., User],
    capsys: pytest.CaptureFixture[str],
) -> None:
    create_user(email="alice@example.com", role=Role.USER)

    exit_code = main(
        ["create-admin", "--email", "alice@example.com"],
        session_factory=session_factory,
        read_password=_no_prompt,
    )

    assert exit_code == 0
    alice = _user(db_session, "alice@example.com")
    assert alice is not None
    assert alice.role is Role.ADMIN
    assert verify_password(DEFAULT_PASSWORD, alice.password_hash)
    assert "Promoted alice@example.com to admin" in capsys.readouterr().out


def test_create_admin_leaves_an_existing_admin_unchanged(
    session_factory: sessionmaker[Session],
    db_session: Session,
    create_user: Callable[..., User],
    capsys: pytest.CaptureFixture[str],
) -> None:
    create_user(email="boss@example.com", role=Role.ADMIN)

    exit_code = main(
        ["create-admin", "--email", "boss@example.com"],
        session_factory=session_factory,
        read_password=_no_prompt,
    )

    assert exit_code == 0
    assert _user_count(db_session) == 1
    assert "boss@example.com is already an admin" in capsys.readouterr().out


@pytest.mark.parametrize(
    ("email", "password"),
    [("not-an-email", "s3cure-admin-pw"), ("boss@example.com", "short")],
    ids=["invalid-email", "short-password"],
)
def test_create_admin_rejects_invalid_input_with_exit_code_2(
    session_factory: sessionmaker[Session],
    db_session: Session,
    capsys: pytest.CaptureFixture[str],
    email: str,
    password: str,
) -> None:
    exit_code = main(
        ["create-admin", "--email", email, "--password", password],
        session_factory=session_factory,
        read_password=_no_prompt,
    )

    assert exit_code == 2
    assert _user_count(db_session) == 0
    assert capsys.readouterr().err.startswith("error:")


def test_running_without_a_command_exits_with_usage_help(
    session_factory: sessionmaker[Session],
) -> None:
    with pytest.raises(SystemExit) as exit_info:
        main([], session_factory=session_factory, read_password=_no_prompt)

    assert exit_info.value.code == 2


# --- seed-demo ----------------------------------------------------------------


def _vehicle_count(db_session: Session) -> int:
    db_session.expire_all()
    return db_session.scalar(select(func.count()).select_from(Vehicle)) or 0


def test_seed_demo_fills_an_empty_inventory(
    session_factory: sessionmaker[Session],
    db_session: Session,
    capsys: pytest.CaptureFixture[str],
) -> None:
    exit_code = main(["seed-demo"], session_factory=session_factory, read_password=_no_prompt)

    assert exit_code == 0
    count = _vehicle_count(db_session)
    assert count >= 10
    assert f"Added {count} demo vehicles" in capsys.readouterr().out


def test_seed_demo_covers_every_category_and_includes_a_sold_out_vehicle(
    session_factory: sessionmaker[Session], db_session: Session
) -> None:
    main(["seed-demo"], session_factory=session_factory, read_password=_no_prompt)

    vehicles = db_session.scalars(select(Vehicle)).all()
    assert {vehicle.category for vehicle in vehicles} == set(VehicleCategory)
    assert any(vehicle.quantity == 0 for vehicle in vehicles)


def test_seed_demo_covers_every_fuel_type_and_transmission(
    session_factory: sessionmaker[Session], db_session: Session
) -> None:
    main(["seed-demo"], session_factory=session_factory, read_password=_no_prompt)

    vehicles = db_session.scalars(select(Vehicle)).all()
    assert {vehicle.fuel_type for vehicle in vehicles} == set(FuelType)
    assert {vehicle.transmission for vehicle in vehicles} == set(Transmission)


def test_seed_demo_never_touches_a_non_empty_inventory(
    session_factory: sessionmaker[Session],
    db_session: Session,
    create_vehicle: Callable[..., Vehicle],
    capsys: pytest.CaptureFixture[str],
) -> None:
    create_vehicle()

    exit_code = main(["seed-demo"], session_factory=session_factory, read_password=_no_prompt)

    assert exit_code == 0
    assert _vehicle_count(db_session) == 1
    assert "Inventory is not empty; no demo vehicles added" in capsys.readouterr().out


def test_seed_demo_is_safe_to_run_twice(
    session_factory: sessionmaker[Session], db_session: Session
) -> None:
    main(["seed-demo"], session_factory=session_factory, read_password=_no_prompt)
    count_after_first_run = _vehicle_count(db_session)

    main(["seed-demo"], session_factory=session_factory, read_password=_no_prompt)

    assert _vehicle_count(db_session) == count_after_first_run
