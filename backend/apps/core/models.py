"""Shared abstract base models."""

import uuid

from django.conf import settings
from django.db import models


class BaseModel(models.Model):
    """Abstract base model with a UUID primary key and audit timestamps."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class TenantBaseModel(BaseModel):
    """Abstract base for tenant-scoped tables carrying a denormalized org FK.

    Every tenant-scoped table holds its own ``organization`` FK so isolation is
    a uniform ``filter(organization=...)`` on each model. The FK uses a string
    reference to avoid a circular import between core and organizations.
    """

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_set",
    )

    class Meta:
        abstract = True


class AuthoredModel(models.Model):
    """Abstract mixin adding nullable authorship to a business entity.

    Records which user created and last updated a row. Both links use
    ``SET_NULL`` so deleting the author keeps the row and drops only the link.
    The service layer is responsible for populating these from the request user.
    """

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(app_label)s_%(class)s_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(app_label)s_%(class)s_updated",
    )

    class Meta:
        abstract = True
