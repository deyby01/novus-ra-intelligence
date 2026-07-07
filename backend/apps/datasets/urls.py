from rest_framework.routers import DefaultRouter

from apps.datasets.views import (
    DatasetFieldViewSet,
    DatasetRowViewSet,
    DatasetViewSet,
)

app_name = "datasets"

router = DefaultRouter()
router.register("datasets", DatasetViewSet, basename="dataset")
router.register("dataset-fields", DatasetFieldViewSet, basename="dataset-field")
router.register("dataset-rows", DatasetRowViewSet, basename="dataset-row")

urlpatterns = router.urls
