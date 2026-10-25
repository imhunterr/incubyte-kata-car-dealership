"""Concurrency tests for stock changes.

Purchases must never oversell, and restocks must never lose an update.

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


def _race(
    app: FastAPI,
    url: str,
    headers: dict[str, str],
    callers: int,
    json: dict[str, int] | None = None,
) -> Counter[int]:
    """Fire ``callers`` simultaneous POSTs to ``url``; return a count of status codes."""
    start_together = threading.Barrier(callers)

    def call() -> int:
        with TestClient(app) as client:
            start_together.wait()
            return client.post(url, json=json, headers=headers).status_code

    with ThreadPoolExecutor(max_workers=callers) as pool:
        return Counter(pool.map(lambda _: call(), range(callers)))


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

    statuses = _race(app, vehicle_url(vehicle.id, "purchase"), user_headers, buyers)

    assert statuses == Counter({200: stock, 409: buyers - stock})
    db_session.refresh(vehicle)
    assert vehicle.quantity == 0


def test_concurrent_restocks_are_all_counted(
    app: FastAPI,
    admin_headers: dict[str, str],
    create_vehicle: Callable[..., Vehicle],
    db_session: Session,
) -> None:
    vehicle = create_vehicle(quantity=0)

    statuses = _race(
        app, vehicle_url(vehicle.id, "restock"), admin_headers, callers=10, json={"quantity": 2}
    )

    assert statuses == Counter({200: 10})
    db_session.refresh(vehicle)
    assert vehicle.quantity == 20
