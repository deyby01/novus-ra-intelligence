"""Organization (tenant) and Membership (user-organization link) models."""

from django.conf import settings
from django.db import models

from apps.core.models import BaseModel


class Organization(BaseModel):
    """A tenant: the top-level account that owns all tenant-scoped data."""

    class Plan(models.TextChoices):
        """Subscription tiers available to an organization."""

        STARTER = "starter", "Starter"
        PRO = "pro", "Pro"
        ENTERPRISE = "enterprise", "Enterprise"

    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    plan = models.CharField(
        max_length=20,
        choices=Plan.choices,
        default=Plan.STARTER,
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Membership(BaseModel):
    """Join table linking a User to an Organization with a scoped role."""

    class Role(models.TextChoices):
        """Roles a user can hold within an organization."""

        ADMIN = "admin", "Admin"
        MANAGER = "manager", "Manager"
        OPERATOR = "operator", "Operator"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.OPERATOR,
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "organization"],
                name="unique_user_per_organization",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user} @ {self.organization} ({self.role})"
