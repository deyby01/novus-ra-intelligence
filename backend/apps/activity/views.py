"""Tenant-scoped, read-only viewset for the workspace activity feed."""

from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from apps.activity.models import ActivityEvent
from apps.activity.serializers import ActivityEventSerializer
from apps.core.tenancy import TenantQuerysetMixin


class ActivityEventViewSet(
    TenantQuerysetMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """List the current organization's activity feed, newest first.

    The feed is append-only and system-written (events are recorded server-side
    when things happen), so the viewset is list-only — no create/update/delete.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ActivityEventSerializer
    queryset = ActivityEvent.objects.select_related("actor", "organization")
    filterset_fields = ["verb", "target_type"]
    ordering_fields = ["created_at"]
