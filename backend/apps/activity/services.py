"""Recording helper for the workspace activity feed."""

from __future__ import annotations

import uuid

from django.contrib.auth import get_user_model

from apps.activity.models import ActivityEvent
from apps.organizations.models import Organization

User = get_user_model()


def record_activity(
    *,
    organization: Organization,
    verb: str,
    target_type: str,
    target_label: str,
    target_id: uuid.UUID | str | None = None,
    actor: User | None = None,
) -> ActivityEvent:
    """Append one event to a workspace's activity feed.

    Keyword-only so every call site stays self-documenting. ``target_label`` is
    stored exactly as passed (the target's current name), so the feed renders
    without a join and keeps reading correctly even if the target later changes.
    """
    return ActivityEvent.objects.create(
        organization=organization,
        actor=actor,
        verb=verb,
        target_type=target_type,
        target_id=target_id,
        target_label=target_label,
    )
