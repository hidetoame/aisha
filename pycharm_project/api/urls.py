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
from api.views.library import TimelineListCreateView, TimelineDetailView, PublicTimelineListView
from api.views.suzuri import (
    create_merchandise,
    get_available_items,
    get_user_products,
    get_product_detail
)

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
    
    # タイムライン関連
    path('timeline/', TimelineListCreateView.as_view(), name='timeline-list-create'),
    path('timeline/public/', PublicTimelineListView.as_view(), name='timeline-public'),
    path('timeline/<str:frontend_id>/', TimelineDetailView.as_view(), name='timeline-detail'),
    
    # SUZURI関連
    path('suzuri/merchandise/', create_merchandise, name='suzuri-create-merchandise'),
    path('suzuri/items/', get_available_items, name='suzuri-get-items'),
    path('suzuri/products/', get_user_products, name='suzuri-get-products'),
    path('suzuri/products/<int:product_id>/', get_product_detail, name='suzuri-get-product-detail'),
]
