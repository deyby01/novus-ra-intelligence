"""Tests for the health check endpoint."""
from rest_framework import status
from rest_framework.test import APIClient

def test_health_check_returns_ok():
    #Arrange 
    client = APIClient()

    #Act
    response = client.get("/api/v1/health/")

    #Assert
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ok"}