"""Tests for the Dataset, DatasetField, DatasetRow, and ImportJob models."""

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction

from apps.datasets.models import Dataset, DatasetField, DatasetRow, ImportJob
from apps.organizations.models import Organization

User = get_user_model()


@pytest.fixture
def user():
    return User.objects.create_user(email="author@example.com", password="pass1234")


@pytest.fixture
def organization():
    return Organization.objects.create(name="Acme Inc.", slug="acme")


@pytest.fixture
def dataset(organization, user):
    return Dataset.objects.create(
        organization=organization,
        name="Sales",
        created_by=user,
        updated_by=user,
    )


# --- Dataset ---


@pytest.mark.django_db
def test_dataset_creates_with_organization_and_author(organization, user):
    dataset = Dataset.objects.create(
        organization=organization,
        name="Sales",
        created_by=user,
        updated_by=user,
    )

    assert dataset.organization == organization
    assert dataset.created_by == user
    assert dataset.updated_by == user


@pytest.mark.django_db
def test_dataset_source_defaults_to_manual(organization):
    dataset = Dataset.objects.create(organization=organization, name="Sales")

    assert dataset.source == "manual"


@pytest.mark.django_db
def test_dataset_accepts_excel_source(organization):
    dataset = Dataset.objects.create(
        organization=organization,
        name="Sales",
        source="excel",
    )

    assert dataset.source == "excel"


@pytest.mark.django_db
def test_dataset_str_returns_name(organization):
    dataset = Dataset.objects.create(organization=organization, name="Sales")

    assert str(dataset) == "Sales"


@pytest.mark.django_db
def test_deleting_author_sets_created_by_null_and_keeps_dataset(organization, user):
    dataset = Dataset.objects.create(
        organization=organization,
        name="Sales",
        created_by=user,
        updated_by=user,
    )

    user.delete()
    dataset.refresh_from_db()

    assert dataset.created_by is None
    assert dataset.updated_by is None
    assert Dataset.objects.filter(pk=dataset.pk).exists()


@pytest.mark.django_db
def test_deleting_organization_cascades_to_dataset(organization):
    Dataset.objects.create(organization=organization, name="Sales")

    organization.delete()

    assert Dataset.objects.count() == 0


# --- DatasetField ---


@pytest.mark.django_db
def test_dataset_field_creates_with_defaults(dataset, organization):
    field = DatasetField.objects.create(
        organization=organization,
        dataset=dataset,
        key="region",
        label="Region",
    )

    assert field.field_type == "text"
    assert field.order == 0


@pytest.mark.django_db
def test_duplicate_key_in_same_dataset_raises(dataset, organization):
    DatasetField.objects.create(
        organization=organization,
        dataset=dataset,
        key="region",
        label="Region",
    )

    with pytest.raises(IntegrityError), transaction.atomic():
        DatasetField.objects.create(
            organization=organization,
            dataset=dataset,
            key="region",
            label="Region Again",
        )


@pytest.mark.django_db
def test_same_key_in_different_dataset_is_allowed(organization):
    dataset_a = Dataset.objects.create(organization=organization, name="A")
    dataset_b = Dataset.objects.create(organization=organization, name="B")

    DatasetField.objects.create(
        organization=organization, dataset=dataset_a, key="region", label="Region"
    )
    DatasetField.objects.create(
        organization=organization, dataset=dataset_b, key="region", label="Region"
    )

    assert DatasetField.objects.filter(key="region").count() == 2


@pytest.mark.django_db
def test_dataset_fields_are_ordered_by_order(dataset, organization):
    DatasetField.objects.create(
        organization=organization, dataset=dataset, key="second", label="Second", order=2
    )
    DatasetField.objects.create(
        organization=organization, dataset=dataset, key="first", label="First", order=1
    )

    keys = list(dataset.fields.values_list("key", flat=True))

    assert keys == ["first", "second"]


# --- DatasetRow ---


@pytest.mark.django_db
def test_dataset_row_persists_json_data(dataset, organization):
    row = DatasetRow.objects.create(
        organization=organization,
        dataset=dataset,
        data={"region": "north", "revenue": 100},
    )
    row.refresh_from_db()

    assert row.data == {"region": "north", "revenue": 100}


@pytest.mark.django_db
def test_dataset_row_jsonb_lookup_filters_by_key(dataset, organization):
    DatasetRow.objects.create(organization=organization, dataset=dataset, data={"region": "north"})
    DatasetRow.objects.create(organization=organization, dataset=dataset, data={"region": "south"})

    north = DatasetRow.objects.filter(data__region="north")

    assert north.count() == 1
    assert north.first().data["region"] == "north"


# --- ImportJob ---


@pytest.mark.django_db
def test_import_job_creates_with_defaults(dataset, organization):
    job = ImportJob.objects.create(
        organization=organization,
        dataset=dataset,
        file="imports/data.xlsx",
    )

    assert job.status == "pending"
    assert job.rows_processed == 0
    assert job.errors == {}


@pytest.mark.django_db
def test_import_job_str(dataset, organization):
    job = ImportJob.objects.create(
        organization=organization,
        dataset=dataset,
        file="imports/data.xlsx",
    )

    assert str(job) == f"{dataset} import (pending)"


@pytest.mark.django_db
def test_deleting_creator_sets_import_job_created_by_null(dataset, organization, user):
    job = ImportJob.objects.create(
        organization=organization,
        dataset=dataset,
        file="imports/data.xlsx",
        created_by=user,
    )

    user.delete()
    job.refresh_from_db()

    assert job.created_by is None
    assert ImportJob.objects.filter(pk=job.pk).exists()


# --- Cascade from Dataset ---


@pytest.mark.django_db
def test_deleting_dataset_cascades_to_children(dataset, organization):
    DatasetField.objects.create(
        organization=organization, dataset=dataset, key="region", label="Region"
    )
    DatasetRow.objects.create(organization=organization, dataset=dataset, data={"region": "north"})
    ImportJob.objects.create(organization=organization, dataset=dataset, file="imports/data.xlsx")

    dataset.delete()

    assert DatasetField.objects.count() == 0
    assert DatasetRow.objects.count() == 0
    assert ImportJob.objects.count() == 0
