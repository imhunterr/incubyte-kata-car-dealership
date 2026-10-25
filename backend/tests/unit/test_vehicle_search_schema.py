"""Unit tests for the search criteria model, ``VehicleSearch``."""

from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.vehicles import VehicleSearch


def test_explicit_none_filters_stay_unset() -> None:
    criteria = VehicleSearch(make=None, model=None)

    assert criteria.make is None
    assert criteria.model is None


@pytest.mark.parametrize(("raw", "expected"), [("  Toyota ", "Toyota"), ("", None), ("  ", None)])
def test_text_filters_are_trimmed_and_blank_means_unset(raw: str, expected: str | None) -> None:
    assert VehicleSearch(make=raw).make == expected


def test_price_bounds_must_be_ordered() -> None:
    with pytest.raises(ValidationError, match="min_price must not be greater than max_price"):
        VehicleSearch(min_price=Decimal("10"), max_price=Decimal("5"))
