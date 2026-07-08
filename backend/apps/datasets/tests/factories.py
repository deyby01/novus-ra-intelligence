"""Factory-boy factories for datasets tenant-isolation tests."""

import factory
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.datasets.models import Dataset, DatasetField, DatasetRow, ImportJob
from apps.organizations.models import Membership, Organization

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    """Build users authenticated by email."""

    class Meta:
        model = User
        skip_postgeneration_save = True

    email = factory.Sequence(lambda n: f"user{n}@example.com")

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        """Hash a password so the user can authenticate through the API."""
        if not create:
            return
        self.set_password(extracted or "pass1234")
        self.save()


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


class DatasetFactory(factory.django.DjangoModelFactory):
    """Build datasets scoped to an organization."""

    class Meta:
        model = Dataset

    organization = factory.SubFactory(OrganizationFactory)
    name = factory.Sequence(lambda n: f"Dataset {n}")


class DatasetFieldFactory(factory.django.DjangoModelFactory):
    """Build dataset field definitions sharing their dataset's organization."""

    class Meta:
        model = DatasetField

    dataset = factory.SubFactory(DatasetFactory)
    organization = factory.SelfAttribute("dataset.organization")
    key = factory.Sequence(lambda n: f"key{n}")
    label = factory.Sequence(lambda n: f"Label {n}")


class DatasetRowFactory(factory.django.DjangoModelFactory):
    """Build dataset rows sharing their dataset's organization."""

    class Meta:
        model = DatasetRow

    dataset = factory.SubFactory(DatasetFactory)
    organization = factory.SelfAttribute("dataset.organization")
    data = factory.LazyFunction(dict)


class ImportJobFactory(factory.django.DjangoModelFactory):
    """Build import jobs sharing their dataset's organization."""

    class Meta:
        model = ImportJob

    dataset = factory.SubFactory(DatasetFactory)
    organization = factory.SelfAttribute("dataset.organization")
    file = factory.LazyFunction(lambda: SimpleUploadedFile("import.xlsx", b"placeholder"))
