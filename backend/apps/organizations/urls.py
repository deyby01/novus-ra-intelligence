"""URL routes for the organizations app."""

from rest_framework.routers import DefaultRouter

from apps.organizations.views import MembershipViewSet

router = DefaultRouter()
router.register("memberships", MembershipViewSet, basename="membership")

urlpatterns = router.urls
