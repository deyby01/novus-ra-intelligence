"""Activity feed: an append-only log of notable workspace events."""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TenantBaseModel


class ActivityEvent(TenantBaseModel):
    """One notable thing that happened in a workspace, for the activity feed.

    The event denormalizes its target's type, id, and label at record time
    instead of holding a foreign key: the feed then renders with no cross-app
    joins, and a readable label survives the target being renamed or deleted.
    """

    class Verb(models.TextChoices):
        """What happened. Each verb maps to one phrase in the feed."""

        DATASET_IMPORTED = "DATASET_IMPORTED", _("Dataset imported")
        REPORT_GENERATED = "REPORT_GENERATED", _("Report generated")
        DASHBOARD_CREATED = "DASHBOARD_CREATED", _("Dashboard created")

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activity_events",
        help_text=_("The member who caused the event; kept if the user is deleted."),
    )
    verb = models.CharField(max_length=32, choices=Verb.choices)
    target_type = models.CharField(
        max_length=32,
        help_text=_("The kind of object the event is about, e.g. 'dataset'."),
    )
    target_id = models.UUIDField(
        null=True,
        blank=True,
        help_text=_("The object's id, so the feed can link to it if it still exists."),
    )
    target_label = models.CharField(
        max_length=255,
        help_text=_("The object's name captured at record time."),
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["organization", "-created_at"])]
        verbose_name = _("Activity event")
        verbose_name_plural = _("Activity events")

    def __str__(self) -> str:
        return f"{self.verb} · {self.target_label}"
