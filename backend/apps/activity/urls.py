from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.activity.views import ActivityEventViewSet

router = DefaultRouter()
router.register(r"activity", ActivityEventViewSet, basename="activity")

urlpatterns = [
    path("", include(router.urls)),
]
