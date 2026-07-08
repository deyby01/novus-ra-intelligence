"""Factory-boy factories for the organizations app tests."""

import factory
from django.contrib.auth import get_user_model

from apps.organizations.models import Membership, Organization

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    """Build users authenticated by email."""

    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"member{n}@example.com")


class OrganizationFactory(factory.django.DjangoModelFactory):
    """Build active tenant organizations."""

    class Meta:
        model = Organization

    name = factory.Sequence(lambda n: f"Org {n}")
    slug = factory.Sequence(lambda n: f"org-{n}")
    is_active = True


class MembershipFactory(factory.django.DjangoModelFactory):
    """Link a user to an organization with an active membership."""

    class Meta:
        model = Membership

    user = factory.SubFactory(UserFactory)
    organization = factory.SubFactory(OrganizationFactory)
    is_active = True
