from django.urls import path
from rest_framework.routers import DefaultRouter

from api.views.category import CategoryViewSet
from api.views.menu import MenuViewSet
from api.views.menu_execution import MenuExecutionView
from api.views.image_upload import ImageUploadView
from api.views.car_settings import CarSettingsListCreateView, CarSettingsDetailView
from api.views.credit_charge import (
    CreditChargeCreateView,
    PaymentConfirmView,
    UserCreditView,
    CreditTransactionHistoryView,
    ChargeHistoryView,
    CreditConsumeView,
    stripe_config
)
from api.views.library import TimelineListCreateView, TimelineDetailView, PublicTimelineListView
from api.views.comment import CommentListCreateView, CommentDeleteView, LikeToggleView, LikeStatusView
from api.views.image_expansion import ImageExpansionView
from api.views.suzuri import (
    create_merchandise,
    get_available_items,
    get_user_products,
    get_product_detail,
    create_purchase_intent,
    confirm_purchase,
    get_user_goods_history
)
from api.views.user_admin import (
    get_user_profile,
    check_admin_status,
    set_admin_status,
    list_admin_users,
    link_frontend_user
)
from api.views.phone_login import (
    send_sms_verification,
    verify_sms_code,
    register_phone_user,
    validate_phone_token
)
from api.views.firebase_auth import (
    check_user_exists,
    get_or_create_user_info,
    validate_firebase_user
)
from api.views.unified_credit_views import (
    get_user_credits,
    get_credit_history,
    consume_credits,
    migrate_phone_user
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'menus', MenuViewSet, basename='menu')

urlpatterns = router.urls

urlpatterns += [
    path('menus/<int:menu_id>/execute/', MenuExecutionView.as_view(), name='menu-execute'),
    path('images/upload/', ImageUploadView.as_view(), name='image-upload'),
    path('car-settings/', CarSettingsListCreateView.as_view(), name='car-settings-list-create'),
    path('car-settings/<int:pk>/', CarSettingsDetailView.as_view(), name='car-settings-detail'),
    
    # クレジットチャージ関連
    path('charges/', CreditChargeCreateView.as_view(), name='credit-charge-create'),
    path('charges/confirm/', PaymentConfirmView.as_view(), name='payment-confirm'),
    path('consume/', CreditConsumeView.as_view(), name='credit-consume'),
    path('users/<str:user_id>/credits/', UserCreditView.as_view(), name='user-credits'),
    path('users/<str:user_id>/credit-transactions/', CreditTransactionHistoryView.as_view(), name='credit-transactions'),
    path('users/<str:user_id>/charge-history/', ChargeHistoryView.as_view(), name='charge-history'),
    path('stripe/config/', stripe_config, name='stripe-config'),
    
    # タイムライン関連
    path('timeline/', TimelineListCreateView.as_view(), name='timeline-list-create'),
    path('timeline/public/', PublicTimelineListView.as_view(), name='timeline-public'),
    path('timeline/<str:frontend_id>/', TimelineDetailView.as_view(), name='timeline-detail'),
    
    # コメント・いいね関連（frontend_idベース）
    path('timeline/<str:frontend_id>/comments/', CommentListCreateView.as_view(), name='comment-list-create'),
    path('timeline/<str:frontend_id>/comments/<uuid:comment_id>/', CommentDeleteView.as_view(), name='comment-delete'),
    path('timeline/<str:frontend_id>/like/', LikeToggleView.as_view(), name='like-toggle'),
    path('timeline/<str:frontend_id>/like/status/', LikeStatusView.as_view(), name='like-status'),
    
    # 画像拡張関連
    path('image-expansion/', ImageExpansionView.as_view(), name='image-expansion'),
    
    # SUZURI関連
path('suzuri/merchandise/', create_merchandise, name='suzuri-create-merchandise'),
path('suzuri/items/', get_available_items, name='suzuri-get-items'),
path('suzuri/products/', get_user_products, name='suzuri-get-products'),
path('suzuri/products/<int:product_id>/', get_product_detail, name='suzuri-get-product-detail'),
path('suzuri/purchase/intent/', create_purchase_intent, name='suzuri-create-purchase-intent'),
path('suzuri/purchase/confirm/', confirm_purchase, name='suzuri-confirm-purchase'),
path('suzuri/history/', get_user_goods_history, name='suzuri-get-user-goods-history'),
    
    # ユーザー管理関連
    path('users/<str:frontend_user_id>/profile/', get_user_profile, name='user-profile'),
    path('users/<str:frontend_user_id>/admin-status/', check_admin_status, name='check-admin-status'),
    path('users/<str:frontend_user_id>/admin-status/set/', set_admin_status, name='set-admin-status'),
    path('users/admin/', list_admin_users, name='list-admin-users'),
    path('users/<int:user_id>/link-frontend/', link_frontend_user, name='link-frontend-user'),
    
    # 電話番号ログイン関連（カスタム実装）
    path('phone-login/send-sms/', send_sms_verification, name='phone-login-send-sms'),
    path('phone-login/verify/', verify_sms_code, name='phone-login-verify'),
    path('phone-login/register/', register_phone_user, name='phone-login-register'),
    path('phone-login/validate/', validate_phone_token, name='phone-login-validate'),
    
    # Firebase認証関連
    path('firebase-auth/check-user/', check_user_exists, name='firebase-check-user'),
    path('firebase-auth/user-info/', get_or_create_user_info, name='firebase-user-info'),
    path('firebase-auth/validate/', validate_firebase_user, name='firebase-validate'),
    
    # 統一クレジットシステム関連
    path('unified-credits/', get_user_credits, name='unified-credits'),
    path('unified-credits/history/', get_credit_history, name='unified-credit-history'),
    path('unified-credits/consume/', consume_credits, name='unified-credit-consume'),
    path('unified-credits/migrate/', migrate_phone_user, name='unified-credit-migrate'),
]
