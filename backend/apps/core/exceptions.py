"""Project-wide DRF exception handling."""

from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def exception_handler(exc: Exception, context: dict) -> Response | None:
    """Extend DRF's default handler with database-integrity translations.

    A delete blocked by a protected relation is a client-resolvable conflict,
    not a server error, so it surfaces as a 409 with a readable message.
    """
    if isinstance(exc, ProtectedError):
        return Response(
            {"detail": "This object is referenced by other objects and cannot be deleted."},
            status=status.HTTP_409_CONFLICT,
        )
    return drf_exception_handler(exc, context)
