"""Views for the accounts app."""

from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import UserSerializer


class MeView(APIView):
    """Return the currently authenticated user."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """Return the authenticated user's public profile."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
