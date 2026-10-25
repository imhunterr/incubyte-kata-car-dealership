"""Tests for searching the inventory, ``GET /api/vehicles/search``.

Every filter is optional; supplied filters are combined with AND.
"""

from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

from app.core.categories import VehicleCategory
from app.models.vehicle import Vehicle
from tests.helpers import VEHICLES_URL

SEARCH_URL = f"{VEHICLES_URL}/search"


@pytest.fixture
def inventory(create_vehicle: Callable[..., Vehicle]) -> dict[str, int]:
    """A small, varied inventory. Returns each vehicle's id by model name."""
    vehicles = [
        create_vehicle(
            make="Toyota", model="Corolla", category=VehicleCategory.SEDAN, price="21999.99"
        ),
        create_vehicle(make="Toyota", model="RAV4", category=VehicleCategory.SUV, price="32000"),
        create_vehicle(
            make="Honda", model="Civic", category=VehicleCategory.HATCHBACK, price="24000"
        ),
        create_vehicle(make="Ford", model="F-150", category=VehicleCategory.TRUCK, price="45000"),
        create_vehicle(
            make="Ford", model="Mustang", category=VehicleCategory.COUPE, price="38000", quantity=0
        ),
    ]
    return {vehicle.model: vehicle.id for vehicle in vehicles}


def _search(
    client: TestClient, headers: dict[str, str], **params: str | int
) -> list[dict[str, object]]:
    response = client.get(SEARCH_URL, params=params, headers=headers)
    assert response.status_code == 200, response.text
    results: list[dict[str, object]] = response.json()
    return results


def _models(results: list[dict[str, object]]) -> list[object]:
    return [vehicle["model"] for vehicle in results]


pytestmark = pytest.mark.usefixtures("inventory")


# --- No filters ---------------------------------------------------------------


def test_without_filters_returns_every_vehicle_ordered_by_id(
    client: TestClient, user_headers: dict[str, str], inventory: dict[str, int]
) -> None:
    results = _search(client, user_headers)

    assert [vehicle["id"] for vehicle in results] == sorted(inventory.values())


def test_empty_text_filters_are_ignored(client: TestClient, user_headers: dict[str, str]) -> None:
    assert len(_search(client, user_headers, make="", model="   ")) == 5


# --- Make and model -----------------------------------------------------------


@pytest.mark.parametrize("term", ["toy", "TOYOTA", "oyo", "  toyota  "])
def test_make_matches_partially_and_case_insensitively(
    client: TestClient, user_headers: dict[str, str], term: str
) -> None:
    assert _models(_search(client, user_headers, make=term)) == ["Corolla", "RAV4"]


@pytest.mark.parametrize(("term", "expected"), [("civ", ["Civic"]), ("-15", ["F-150"])])
def test_model_matches_partially_and_case_insensitively(
    client: TestClient, user_headers: dict[str, str], term: str, expected: list[str]
) -> None:
    assert _models(_search(client, user_headers, model=term)) == expected


@pytest.mark.parametrize("term", ["%", "_", "\\"])
def test_sql_wildcards_in_text_filters_match_literally(
    client: TestClient, user_headers: dict[str, str], term: str
) -> None:
    # Unescaped, "%" or "_" would act as LIKE wildcards and match everything.
    assert _search(client, user_headers, make=term) == []


# --- Category -----------------------------------------------------------------


def test_category_matches_exactly(client: TestClient, user_headers: dict[str, str]) -> None:
    assert _models(_search(client, user_headers, category="suv")) == ["RAV4"]


def test_unknown_category_returns_422(client: TestClient, user_headers: dict[str, str]) -> None:
    response = client.get(SEARCH_URL, params={"category": "spaceship"}, headers=user_headers)

    assert response.status_code == 422


# --- Price range --------------------------------------------------------------


def test_min_price_is_inclusive(client: TestClient, user_headers: dict[str, str]) -> None:
    assert _models(_search(client, user_headers, min_price="38000")) == ["F-150", "Mustang"]


def test_max_price_is_inclusive(client: TestClient, user_headers: dict[str, str]) -> None:
    assert _models(_search(client, user_headers, max_price="24000")) == ["Corolla", "Civic"]


def test_price_range_with_both_bounds(client: TestClient, user_headers: dict[str, str]) -> None:
    results = _search(client, user_headers, min_price="24000", max_price="38000")

    assert _models(results) == ["RAV4", "Civic", "Mustang"]


def test_equal_bounds_match_that_exact_price(
    client: TestClient, user_headers: dict[str, str]
) -> None:
    results = _search(client, user_headers, min_price="21999.99", max_price="21999.99")

    assert _models(results) == ["Corolla"]


def test_min_price_above_max_price_returns_422(
    client: TestClient, user_headers: dict[str, str]
) -> None:
    response = client.get(
        SEARCH_URL, params={"min_price": "50000", "max_price": "10000"}, headers=user_headers
    )

    assert response.status_code == 422
    assert "min_price must not be greater than max_price" in response.text


@pytest.mark.parametrize("param", ["min_price", "max_price"])
@pytest.mark.parametrize("value", ["-1", "abc"])
def test_invalid_price_bound_returns_422(
    client: TestClient, user_headers: dict[str, str], param: str, value: str
) -> None:
    response = client.get(SEARCH_URL, params={param: value}, headers=user_headers)

    assert response.status_code == 422


# --- Combined filters and edge cases ------------------------------------------


def test_filters_are_combined_with_and(client: TestClient, user_headers: dict[str, str]) -> None:
    results = _search(client, user_headers, make="ford", max_price="40000")

    assert _models(results) == ["Mustang"]


def test_all_filters_together(client: TestClient, user_headers: dict[str, str]) -> None:
    results = _search(
        client,
        user_headers,
        make="toyota",
        model="rav",
        category="suv",
        min_price="30000",
        max_price="35000",
    )

    assert _models(results) == ["RAV4"]


def test_results_include_out_of_stock_vehicles(
    client: TestClient, user_headers: dict[str, str]
) -> None:
    results = _search(client, user_headers, model="mustang")

    assert [vehicle["quantity"] for vehicle in results] == [0]


def test_no_matches_returns_an_empty_list(client: TestClient, user_headers: dict[str, str]) -> None:
    assert _search(client, user_headers, make="Ferrari") == []


def test_anonymous_caller_cannot_search(client: TestClient) -> None:
    response = client.get(SEARCH_URL, params={"make": "toyota"})

    assert response.status_code == 401
