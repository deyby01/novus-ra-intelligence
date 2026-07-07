"""Unit tests for tenant resolution from the X-Organization header."""

import uuid

import pytest
from rest_framework.exceptions import NotFound, ParseError
from rest_framework.test import APIRequestFactory

from apps.core.tenancy import resolve_current_organization
from apps.datasets.tests.factories import (
    MembershipFactory,
    OrganizationFactory,
    UserFactory,
)


def _request(user, header_value=None):
    """Build a DRF request with the user set and an optional org header."""
    factory = APIRequestFactory()
    extra = {}
    if header_value is not None:
        extra["HTTP_X_ORGANIZATION"] = header_value
    request = factory.get("/", **extra)
    request.user = user
    return request


@pytest.mark.django_db
def test_missing_header_raises_parse_error():
    user = UserFactory()

    with pytest.raises(ParseError):
        resolve_current_organization(_request(user))


@pytest.mark.django_db
def test_empty_header_raises_parse_error():
    user = UserFactory()

    with pytest.raises(ParseError):
        resolve_current_organization(_request(user, ""))


@pytest.mark.django_db
def test_non_uuid_header_raises_parse_error():
    user = UserFactory()

    with pytest.raises(ParseError):
        resolve_current_organization(_request(user, "not-a-uuid"))


@pytest.mark.django_db
def test_unknown_org_id_raises_not_found():
    user = UserFactory()

    with pytest.raises(NotFound):
        resolve_current_organization(_request(user, str(uuid.uuid4())))


@pytest.mark.django_db
def test_user_not_a_member_raises_not_found():
    user = UserFactory()
    organization = OrganizationFactory()

    with pytest.raises(NotFound):
        resolve_current_organization(_request(user, str(organization.id)))


@pytest.mark.django_db
def test_inactive_membership_raises_not_found():
    membership = MembershipFactory(is_active=False)

    with pytest.raises(NotFound):
        resolve_current_organization(_request(membership.user, str(membership.organization.id)))


@pytest.mark.django_db
def test_inactive_organization_raises_not_found():
    organization = OrganizationFactory(is_active=False)
    membership = MembershipFactory(organization=organization)

    with pytest.raises(NotFound):
        resolve_current_organization(_request(membership.user, str(organization.id)))


@pytest.mark.django_db
def test_active_membership_returns_organization():
    membership = MembershipFactory()

    resolved = resolve_current_organization(
        _request(membership.user, str(membership.organization.id))
    )

    assert resolved == membership.organization
