"""Admin registration for accounts (users) with safe password handling.

The custom :class:`~apps.accounts.models.User` is email-based (no username), so
Django's stock ``UserAdmin`` cannot be used as-is. A plain ``ModelAdmin`` is also
wrong: it renders ``password`` as an editable text field, and saving it would
store the raw string unhashed and lock the user out. This admin uses a
hash-aware change form and a hashing create form, plus the standard
``../password/`` change-password flow inherited from ``DjangoUserAdmin``.
"""

from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from django.contrib.auth.password_validation import validate_password

from apps.accounts.models import User


class UserChangeForm(forms.ModelForm):
    """Change form that shows the password hash read-only, never as plaintext."""

    password = ReadOnlyPasswordHashField(
        label="Password",
        help_text=(
            "Raw passwords are not stored, so there is no way to see this user's "
            'password, but you can change it using <a href="../password/">this form</a>.'
        ),
    )

    class Meta:
        model = User
        fields = (
            "email",
            "password",
            "is_active",
            "is_staff",
            "is_superuser",
            "groups",
            "user_permissions",
        )


class UserCreationForm(forms.ModelForm):
    """Create form that validates and hashes the password before saving."""

    password1 = forms.CharField(label="Password", widget=forms.PasswordInput)
    password2 = forms.CharField(label="Password confirmation", widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ("email",)

    def clean_password2(self) -> str:
        """Confirm both passwords match and satisfy the password policy."""
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("The two password fields don't match.")
        validate_password(password2)
        return password2

    def save(self, commit: bool = True) -> User:
        """Hash the entered password onto the user before persisting."""
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    """Admin for the email-based custom User, with correct password handling."""

    form = UserChangeForm
    add_form = UserCreationForm

    list_display = ("email", "is_staff", "is_superuser", "is_active", "created_at")
    list_filter = ("is_staff", "is_superuser", "is_active")
    search_fields = ("email",)
    ordering = ("-created_at",)
    readonly_fields = ("last_login", "created_at", "updated_at")
    filter_horizontal = ("groups", "user_permissions")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "created_at", "updated_at")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2"),
            },
        ),
    )
