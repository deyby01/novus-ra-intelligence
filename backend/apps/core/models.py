"""Shared abstract base models."""

import uuid

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
