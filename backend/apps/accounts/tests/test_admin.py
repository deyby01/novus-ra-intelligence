"""The user admin hashes new passwords and never edits the stored hash as text."""

import pytest
from django.contrib.auth.forms import ReadOnlyPasswordHashField

from apps.accounts.admin import UserChangeForm, UserCreationForm


def test_change_form_password_is_a_read_only_hash():
    """The change form must never expose password as an editable plaintext input."""
    field = UserChangeForm.base_fields["password"]
    assert isinstance(field, ReadOnlyPasswordHashField)


@pytest.mark.django_db
def test_creation_form_hashes_the_password():
    form = UserCreationForm(
        data={
            "email": "new@example.com",
            "password1": "S3curePass!23",
            "password2": "S3curePass!23",
        }
    )
    assert form.is_valid(), form.errors

    user = form.save()

    assert user.password != "S3curePass!23"  # stored hashed, not verbatim
    assert user.check_password("S3curePass!23")


@pytest.mark.django_db
def test_creation_form_rejects_mismatched_passwords():
    form = UserCreationForm(
        data={
            "email": "new@example.com",
            "password1": "S3curePass!23",
            "password2": "different!45",
        }
    )
    assert not form.is_valid()
    assert "password2" in form.errors


@pytest.mark.django_db
def test_creation_form_enforces_the_password_policy():
    form = UserCreationForm(
        data={"email": "new@example.com", "password1": "123", "password2": "123"}
    )
    assert not form.is_valid()
    assert "password2" in form.errors
