from rest_framework import serializers

from apps.activity.models import ActivityEvent


class ActivityEventSerializer(serializers.ModelSerializer):
    """Read serializer for the workspace activity feed."""

    class Meta:
        model = ActivityEvent
        fields = (
            "id",
            "verb",
            "target_type",
            "target_id",
            "target_label",
            "actor_email",
            "created_at",
        )

    # The actor's email, so the feed can attribute an event to a teammate. The
    # actor uses SET_NULL, so a deleted user reads as null (handled by the client).
    actor_email = serializers.SerializerMethodField()

    def get_actor_email(self, obj: ActivityEvent) -> str | None:
        """Return the actor's email, or None for a system/anonymized event."""
        return obj.actor.email if obj.actor_id else None
