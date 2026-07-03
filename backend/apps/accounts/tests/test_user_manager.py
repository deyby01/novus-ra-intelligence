"""Tests for the custom User model and its manager."""

import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
def test_create_user_with_email():
    user = User.objects.create_user(email="user@example.com", password="pass1234")

    assert user.email == "user@example.com"
    assert user.check_password("pass1234")
    assert user.is_active
    assert not user.is_staff
    assert not user.is_superuser


@pytest.mark.django_db
def test_create_user_without_email_raises():
    with pytest.raises(ValueError):
        User.objects.create_user(email="", password="pass1234")


@pytest.mark.django_db
def test_create_superuser():
    admin = User.objects.create_superuser(email="admin@example.com", password="pass1234")

    assert admin.is_staff
    assert admin.is_superuser


@pytest.mark.django_db
def test_user_str_is_email():
    user = User.objects.create_user(email="user@example.com", password="pass1234")

    assert str(user) == "user@example.com"
