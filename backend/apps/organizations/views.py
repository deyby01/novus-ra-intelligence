"""Views for the organizations app."""

from django.db.models import QuerySet
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.organizations.models import Membership
from apps.organizations.serializers import MembershipSerializer


class MembershipViewSet(viewsets.ReadOnlyModelViewSet):
    """List the current user's active workspaces (the org-picker source).

    Scoped to ``request.user`` rather than to a tenant header: this is the
    endpoint the client calls before it has chosen an organization, so it must
    not require one. Only active memberships on active organizations are shown.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = MembershipSerializer

    def get_queryset(self) -> QuerySet:
        """Return the requesting user's active memberships on active orgs."""
        return (
            Membership.objects.filter(
                user=self.request.user,
                is_active=True,
                organization__is_active=True,
            )
            .select_related("organization")
            .order_by("organization__name")
        )
