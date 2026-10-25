"""Guards for the domain-error → HTTP mapping in ``app.api.errors``."""

from fastapi import status

from app.api.errors import response_for
from app.core.errors import DomainError, EmailAlreadyRegisteredError


def _all_subclasses(cls: type[DomainError]) -> set[type[DomainError]]:
    direct = set(cls.__subclasses__())
    return direct.union(*(_all_subclasses(sub) for sub in direct))


def test_every_domain_error_has_an_http_mapping() -> None:
    # A new DomainError without a mapping would surface as a 500 at runtime;
    # this test catches it at build time instead.
    for error_type in _all_subclasses(DomainError):
        response = response_for(error_type())

        assert 400 <= response.status_code < 500, error_type.__name__


def test_a_subclass_inherits_the_mapping_of_its_parent() -> None:
    class StillADuplicateError(EmailAlreadyRegisteredError):
        pass

    assert response_for(StillADuplicateError()).status_code == status.HTTP_409_CONFLICT
