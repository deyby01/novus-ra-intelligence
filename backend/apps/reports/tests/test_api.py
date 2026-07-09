import pytest
import uuid
from django.urls import reverse
from rest_framework import status
from unittest.mock import patch
from rest_framework.test import APIClient

from apps.datasets.tests.factories import DatasetFactory, UserFactory
from apps.reports.models import Report, ReportStatus


@pytest.mark.django_db
class TestReportAPI:
    def test_create_report_requires_auth(self):
        api_client = APIClient()
        url = reverse("report-list")
        response = api_client.post(url, {"dataset": 1})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @patch("apps.reports.services.generate_report_task.delay")
    def test_create_report_success(self, mock_delay):
        api_client = APIClient()
        user = UserFactory()
        dataset = DatasetFactory(created_by=user)
        api_client.force_authenticate(user=user)
        
        url = reverse("report-list")
        response = api_client.post(url, {"dataset": str(dataset.id)})
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == ReportStatus.PENDING
        assert response.data["dataset"] == dataset.id
        
        report_id = response.data["id"]
        assert Report.objects.filter(id=report_id).exists()

    def test_create_report_invalid_dataset(self):
        api_client = APIClient()
        user = UserFactory()
        api_client.force_authenticate(user=user)
        
        url = reverse("report-list")
        response = api_client.post(url, {"dataset": str(uuid.uuid4())})
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_list_reports(self):
        api_client = APIClient()
        user = UserFactory()
        dataset = DatasetFactory(created_by=user)
        Report.objects.create(dataset=dataset, created_by=user, updated_by=user)
        Report.objects.create(dataset=dataset, created_by=user, updated_by=user)
        
        api_client.force_authenticate(user=user)
        url = reverse("report-list")
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 2

    def test_retrieve_report(self):
        api_client = APIClient()
        user = UserFactory()
        dataset = DatasetFactory(created_by=user)
        report = Report.objects.create(
            dataset=dataset, 
            status=ReportStatus.COMPLETED, 
            content="Insightful text",
            created_by=user,
            updated_by=user
        )
        
        api_client.force_authenticate(user=user)
        url = reverse("report-detail", args=[str(report.id)])
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data["content"] == "Insightful text"
