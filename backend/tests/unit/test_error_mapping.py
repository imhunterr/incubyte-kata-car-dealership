"""Guards for the domain-error → HTTP mapping in ``app.api.errors``."""

from app.api.errors import ERROR_RESPONSES
from app.core.errors import DomainError


def _all_subclasses(cls: type[DomainError]) -> set[type[DomainError]]:
    direct = set(cls.__subclasses__())
    return direct.union(*(_all_subclasses(sub) for sub in direct))


def test_every_domain_error_has_an_http_mapping() -> None:
    # A new DomainError without a mapping would surface as a 500 at runtime;
    # this test catches it at build time instead.
    unmapped = {error.__name__ for error in _all_subclasses(DomainError)} - {
        error.__name__ for error in ERROR_RESPONSES
    }

    assert unmapped == set()
