"""Concurrency tests for purchases: stock must never be oversold.

Many clients race to buy the same vehicle at the same moment (a barrier
releases them together). Each request runs in its own thread, with its own
database connection, exactly as concurrent requests do in production.
"""

import threading
from collections import Counter
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle
from tests.helpers import vehicle_url


def _race_to_purchase(
    app: FastAPI, vehicle_id: int, headers: dict[str, str], buyers: int
) -> Counter[int]:
    """Fire ``buyers`` simultaneous purchases; return a count of status codes."""
    start_together = threading.Barrier(buyers)
    url = vehicle_url(vehicle_id, "purchase")

    def buy() -> int:
        with TestClient(app) as client:
            start_together.wait()
            return client.post(url, headers=headers).status_code

    with ThreadPoolExecutor(max_workers=buyers) as pool:
        return Counter(pool.map(lambda _: buy(), range(buyers)))


@pytest.mark.parametrize(("stock", "buyers"), [(1, 10), (3, 10)])
def test_concurrent_purchases_never_oversell(
    app: FastAPI,
    user_headers: dict[str, str],
    create_vehicle: Callable[..., Vehicle],
    db_session: Session,
    stock: int,
    buyers: int,
) -> None:
    vehicle = create_vehicle(quantity=stock)

    statuses = _race_to_purchase(app, vehicle.id, user_headers, buyers)

    assert statuses == Counter({200: stock, 409: buyers - stock})
    db_session.refresh(vehicle)
    assert vehicle.quantity == 0
