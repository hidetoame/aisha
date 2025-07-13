from django.urls import path
from rest_framework.routers import DefaultRouter

from api.views.category import CategoryViewSet
from api.views.menu import MenuViewSet
from api.views.menu_execution import MenuExecutionView
from api.views.car_settings import CarSettingsListCreateView, CarSettingsDetailView

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'menus', MenuViewSet, basename='menu')

urlpatterns = router.urls

urlpatterns += [
    path('menus/<int:menu_id>/execute/', MenuExecutionView.as_view(), name='menu-execute'),
    path('car-settings/', CarSettingsListCreateView.as_view(), name='car-settings-list-create'),
    path('car-settings/<int:pk>/', CarSettingsDetailView.as_view(), name='car-settings-detail'),
]
