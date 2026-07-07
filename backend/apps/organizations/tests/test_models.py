"""Tests for the Organization and Membership models."""

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction

from apps.organizations.models import Membership, Organization

User = get_user_model()


@pytest.fixture
def user():
    return User.objects.create_user(email="user@example.com", password="pass1234")


@pytest.fixture
def other_user():
    return User.objects.create_user(email="other@example.com", password="pass1234")


@pytest.fixture
def organization():
    return Organization.objects.create(name="Acme Inc.", slug="acme")


# --- Organization ---


@pytest.mark.django_db
def test_organization_creates_with_defaults():
    org = Organization.objects.create(name="Acme Inc.", slug="acme")

    assert org.plan == "starter"
    assert org.is_active is True


@pytest.mark.django_db
def test_organization_slug_must_be_unique():
    Organization.objects.create(name="Acme Inc.", slug="acme")

    with pytest.raises(IntegrityError), transaction.atomic():
        Organization.objects.create(name="Acme Duplicate", slug="acme")


@pytest.mark.django_db
def test_organization_str_returns_name():
    org = Organization.objects.create(name="Acme Inc.", slug="acme")

    assert str(org) == "Acme Inc."


# --- Membership ---


@pytest.mark.django_db
def test_membership_links_user_and_organization(user, organization):
    membership = Membership.objects.create(user=user, organization=organization, role="admin")

    assert membership.user == user
    assert membership.organization == organization
    assert membership.role == "admin"


@pytest.mark.django_db
def test_membership_role_defaults_to_operator(user, organization):
    membership = Membership.objects.create(user=user, organization=organization)

    assert membership.role == "operator"


@pytest.mark.django_db
def test_membership_is_active_defaults_to_true(user, organization):
    membership = Membership.objects.create(user=user, organization=organization)

    assert membership.is_active is True


@pytest.mark.django_db
def test_membership_str(user, organization):
    membership = Membership.objects.create(user=user, organization=organization, role="admin")

    assert str(membership) == f"{user} @ {organization} (admin)"


@pytest.mark.django_db
def test_membership_unique_user_per_organization(user, organization):
    Membership.objects.create(user=user, organization=organization)

    with pytest.raises(IntegrityError), transaction.atomic():
        Membership.objects.create(user=user, organization=organization)


@pytest.mark.django_db
def test_same_user_in_different_organizations_is_allowed(user):
    org_a = Organization.objects.create(name="Org A", slug="org-a")
    org_b = Organization.objects.create(name="Org B", slug="org-b")

    Membership.objects.create(user=user, organization=org_a)
    Membership.objects.create(user=user, organization=org_b)

    assert Membership.objects.filter(user=user).count() == 2


@pytest.mark.django_db
def test_different_users_in_same_organization_is_allowed(user, other_user, organization):
    Membership.objects.create(user=user, organization=organization)
    Membership.objects.create(user=other_user, organization=organization)

    assert Membership.objects.filter(organization=organization).count() == 2


@pytest.mark.django_db
def test_deleting_user_cascades_to_membership(user, organization):
    Membership.objects.create(user=user, organization=organization)

    user.delete()

    assert Membership.objects.count() == 0


@pytest.mark.django_db
def test_deleting_organization_cascades_to_membership(user, organization):
    Membership.objects.create(user=user, organization=organization)

    organization.delete()

    assert Membership.objects.count() == 0
