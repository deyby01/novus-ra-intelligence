"""Integration tests for the ImportJob API (eager Celery, tenant isolation)."""

from io import BytesIO

import pandas as pd
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.datasets.models import ImportJob
from apps.datasets.tests.factories import (
    DatasetFactory,
    ImportJobFactory,
    MembershipFactory,
)

IMPORT_JOBS_URL = "/api/v1/import-jobs/"


@pytest.fixture
def membership_a():
    """An active membership; its user acts as tenant A throughout."""
    return MembershipFactory()


@pytest.fixture
def org_a(membership_a):
    return membership_a.organization


@pytest.fixture
def user_a(membership_a):
    return membership_a.user


@pytest.fixture
def org_b():
    """A second organization the tenant-A user is not a member of."""
    return DatasetFactory().organization


def _auth_client(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


def _org_header(organization):
    return {"HTTP_X_ORGANIZATION": str(organization.id)}


def _workbook_upload(name="import.xlsx"):
    frame = pd.DataFrame({"Region": ["North", "South"], "Amount": [10, 20]})
    buffer = BytesIO()
    frame.to_excel(buffer, index=False, engine="openpyxl")
    buffer.seek(0)
    buffer.name = name
    return buffer


@pytest.mark.django_db
def test_create_runs_import_and_marks_job_done(user_a, org_a):
    dataset = DatasetFactory(organization=org_a)
    client = _auth_client(user_a)

    response = client.post(
        IMPORT_JOBS_URL,
        {"dataset": str(dataset.id), "file": _workbook_upload()},
        format="multipart",
        **_org_header(org_a),
    )

    assert response.status_code == status.HTTP_201_CREATED
    job = ImportJob.objects.get(pk=response.data["id"])
    assert job.organization == org_a
    assert job.created_by == user_a
    assert job.status == ImportJob.Status.DONE
    assert job.rows_processed == 2
    assert dataset.rows.count() == 2


@pytest.mark.django_db
def test_create_against_other_tenant_dataset_returns_400(user_a, org_a, org_b):
    foreign_dataset = DatasetFactory(organization=org_b)
    client = _auth_client(user_a)

    response = client.post(
        IMPORT_JOBS_URL,
        {"dataset": str(foreign_dataset.id), "file": _workbook_upload()},
        format="multipart",
        **_org_header(org_a),
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert not ImportJob.objects.filter(dataset=foreign_dataset).exists()
    assert foreign_dataset.rows.count() == 0


@pytest.mark.django_db
def test_create_without_org_header_returns_400(user_a, org_a):
    dataset = DatasetFactory(organization=org_a)
    client = _auth_client(user_a)

    response = client.post(
        IMPORT_JOBS_URL,
        {"dataset": str(dataset.id), "file": _workbook_upload()},
        format="multipart",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert ImportJob.objects.count() == 0


@pytest.mark.django_db
def test_create_unauthenticated_returns_401(org_a):
    dataset = DatasetFactory(organization=org_a)
    client = APIClient()

    response = client.post(
        IMPORT_JOBS_URL,
        {"dataset": str(dataset.id), "file": _workbook_upload()},
        format="multipart",
        **_org_header(org_a),
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_create_with_non_excel_file_marks_job_error(user_a, org_a):
    dataset = DatasetFactory(organization=org_a)
    client = _auth_client(user_a)
    garbage = BytesIO(b"this is not a spreadsheet")
    garbage.name = "import.xlsx"

    response = client.post(
        IMPORT_JOBS_URL,
        {"dataset": str(dataset.id), "file": garbage},
        format="multipart",
        **_org_header(org_a),
    )

    assert response.status_code == status.HTTP_201_CREATED
    job = ImportJob.objects.get(pk=response.data["id"])
    assert job.status == ImportJob.Status.ERROR
    assert job.errors.get("detail")
    assert dataset.rows.count() == 0


@pytest.mark.django_db
def test_create_rejects_non_excel_extension(user_a, org_a):
    dataset = DatasetFactory(organization=org_a)
    client = _auth_client(user_a)
    upload = _workbook_upload(name="import.csv")

    response = client.post(
        IMPORT_JOBS_URL,
        {"dataset": str(dataset.id), "file": upload},
        format="multipart",
        **_org_header(org_a),
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert ImportJob.objects.count() == 0


@pytest.mark.django_db
def test_list_is_tenant_filtered_and_paginated(user_a, org_a, org_b):
    ImportJobFactory(dataset=DatasetFactory(organization=org_a))
    ImportJobFactory(dataset=DatasetFactory(organization=org_a))
    ImportJobFactory(dataset=DatasetFactory(organization=org_b))
    client = _auth_client(user_a)

    response = client.get(IMPORT_JOBS_URL, **_org_header(org_a))

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 2
    assert "results" in response.data


@pytest.mark.django_db
def test_retrieve_other_tenant_job_returns_404(user_a, org_a, org_b):
    foreign_job = ImportJobFactory(dataset=DatasetFactory(organization=org_b))
    client = _auth_client(user_a)

    response = client.get(f"{IMPORT_JOBS_URL}{foreign_job.id}/", **_org_header(org_a))

    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_job_is_read_only_after_creation(user_a, org_a):
    job = ImportJobFactory(dataset=DatasetFactory(organization=org_a))
    client = _auth_client(user_a)

    response = client.delete(f"{IMPORT_JOBS_URL}{job.id}/", **_org_header(org_a))

    assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
