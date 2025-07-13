from django.urls import path
from rest_framework.routers import DefaultRouter

from api.views.category import CategoryViewSet
from api.views.menu import MenuViewSet
from api.views.menu_execution import MenuExecutionView
from api.views.car_settings import CarSettingsListCreateView, CarSettingsDetailView
from api.views.credit_charge import (
    CreditChargeCreateView,
    PaymentConfirmView,
    UserCreditView,
    CreditTransactionHistoryView,
    ChargeHistoryView,
    stripe_config
)
from api.views.library import LibraryListCreateView, LibraryDetailView, PublicLibraryListView

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'menus', MenuViewSet, basename='menu')

urlpatterns = router.urls

urlpatterns += [
    path('menus/<int:menu_id>/execute/', MenuExecutionView.as_view(), name='menu-execute'),
    path('car-settings/', CarSettingsListCreateView.as_view(), name='car-settings-list-create'),
    path('car-settings/<int:pk>/', CarSettingsDetailView.as_view(), name='car-settings-detail'),
    
    # クレジットチャージ関連
    path('charges/', CreditChargeCreateView.as_view(), name='credit-charge-create'),
    path('charges/confirm/', PaymentConfirmView.as_view(), name='payment-confirm'),
    path('users/<str:user_id>/credits/', UserCreditView.as_view(), name='user-credits'),
    path('users/<str:user_id>/credit-transactions/', CreditTransactionHistoryView.as_view(), name='credit-transactions'),
    path('users/<str:user_id>/charge-history/', ChargeHistoryView.as_view(), name='charge-history'),
    path('stripe/config/', stripe_config, name='stripe-config'),
    
    # ライブラリ関連
    path('library/', LibraryListCreateView.as_view(), name='library-list-create'),
    path('library/<str:frontend_id>/', LibraryDetailView.as_view(), name='library-detail'),
    path('library/public/', PublicLibraryListView.as_view(), name='library-public'),
]
