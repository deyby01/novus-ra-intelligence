"""Tenant resolution and scoping shared by every tenant-scoped API view.

The current organization for a request is resolved from the ``X-Organization``
header carrying an organization UUID. The header is never trusted as authority:
membership is validated on the server against an active ``Membership`` before any
tenant data is touched.
"""

import uuid
from functools import cached_property

from django.db.models import QuerySet
from rest_framework.exceptions import NotFound, ParseError
from rest_framework.request import Request
from rest_framework.serializers import BaseSerializer

from apps.organizations.models import Membership, Organization

ORGANIZATION_HEADER = "X-Organization"


def resolve_current_organization(request: Request) -> Organization:
    """Resolve and authorize the current organization for a request.

    Reads the ``X-Organization`` header, validates it is a UUID, and confirms the
    requesting user holds an active membership on an active organization with that
    id. The lookup is a single database-side-filtered query.

    Args:
        request: The incoming request carrying the authenticated user and header.

    Returns:
        The authorized :class:`~apps.organizations.models.Organization`.

    Raises:
        ParseError: The header is missing/empty or is not a valid UUID.
        NotFound: No active membership exists for the user on that active
            organization (also covers an unknown or inactive organization).
    """
    raw_value = request.headers.get(ORGANIZATION_HEADER)
    if not raw_value:
        raise ParseError(f"The {ORGANIZATION_HEADER} header is required.")
    try:
        organization_id = uuid.UUID(raw_value)
    except ValueError as exc:
        raise ParseError(f"The {ORGANIZATION_HEADER} header must be a valid UUID.") from exc

    membership = (
        Membership.objects.filter(
            user=request.user,
            organization_id=organization_id,
            is_active=True,
            organization__is_active=True,
        )
        .select_related("organization")
        .first()
    )
    if membership is None:
        raise NotFound("Organization not found.")
    return membership.organization


class TenantQuerysetMixin:
    """Scope a viewset's queryset and create writes to the current organization.

    Filtering and assignment both derive from the resolved organization, so the
    client can neither read nor write outside its own tenant. ``perform_create``
    accumulates injected fields through ``**kwargs`` and performs the single
    ``serializer.save`` at the bottom of the cooperative chain, so it composes
    with :class:`AuthoredModelViewSetMixin` on the same viewset.
    """

    request: Request

    @cached_property
    def current_organization(self) -> Organization:
        """Resolve and cache the request's organization for the whole request."""
        return resolve_current_organization(self.request)

    def get_queryset(self) -> QuerySet:
        """Restrict the base queryset to the current organization's rows."""
        return super().get_queryset().filter(organization=self.current_organization)

    def perform_create(self, serializer: BaseSerializer, **kwargs) -> None:
        """Persist the object bound to the current organization plus any kwargs."""
        serializer.save(organization=self.current_organization, **kwargs)


class AuthoredModelViewSetMixin:
    """Stamp create/update authorship from the request user on write.

    Sits left of :class:`TenantQuerysetMixin` in the MRO. On create it forwards
    the author fields up the chain via ``super().perform_create``; the tenant
    mixin then adds the organization and issues the single save. This guarantees
    both the organization and author land on the same insert.
    """

    request: Request

    def perform_create(self, serializer: BaseSerializer, **kwargs) -> None:
        """Add author fields on create and delegate the save upward."""
        super().perform_create(
            serializer,
            created_by=self.request.user,
            updated_by=self.request.user,
            **kwargs,
        )

    def perform_update(self, serializer: BaseSerializer) -> None:
        """Set the last-editor on update."""
        serializer.save(updated_by=self.request.user)
