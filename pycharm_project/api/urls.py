from django.urls import path
from rest_framework.routers import DefaultRouter

from api.views.category import CategoryViewSet
from api.views.menu import MenuViewSet
from api.views.menu_execution import MenuExecutionView
from api.views.image_upload import ImageUploadView
from api.views.menu_image_upload import MenuImageUploadView
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
from api.views.goods_management import (
    goods_management_list,
    goods_management_detail,
    goods_management_update,
    sync_suzuri_items,
    public_goods_list
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
    validate_phone_token,
    check_phone_user_exists
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
from api.views.admin_credit import (
    add_credits_to_user,
    get_user_credits as admin_get_user_credits,
    delete_user,
    get_all_users,
    get_generation_history_stats,
    get_generation_history_list
)
from api.views.charge_option import (
    ChargeOptionListView,
    ChargeOptionDetailView,
    ChargeOptionCreateView,
    ChargeOptionUpdateView,
    ChargeOptionDeleteView
)

from api.views import health_check
from api.views.migrate_endpoint import run_migrations, migration_status
from api.views.db_inspect import inspect_database_tables
from api.views.db_test import db_connection_test
from api.views.aws_sms_auth import (
    AWSSMSAuthView,
    AWSSMSVerifyView,
    AWSSMSUserInfoView
)
from api.views.stripe_webhook import stripe_webhook
from api.views.sales_management import SalesManagementView, SalesMonthlyDetailView
from api.views.mygarage_auth import register_mygarage_user

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'menus', MenuViewSet, basename='menu')

urlpatterns = router.urls

urlpatterns += [
    # ヘルスチェック
    path('health/', health_check, name='health'),
    path('menus/<int:menu_id>/execute/', MenuExecutionView.as_view(), name='menu-execute'),
    path('images/upload/', ImageUploadView.as_view(), name='image-upload'),
    path('menu-images/upload/', MenuImageUploadView.as_view(), name='menu-image-upload'),
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
    
    # チャージオプション関連
    path('charge-options/', ChargeOptionListView.as_view(), name='charge-options-list'),
    path('charge-options/<int:pk>/', ChargeOptionDetailView.as_view(), name='charge-options-detail'),
    path('charge-options/create/', ChargeOptionCreateView.as_view(), name='charge-options-create'),
    path('charge-options/<int:pk>/update/', ChargeOptionUpdateView.as_view(), name='charge-options-update'),
    path('charge-options/<int:pk>/delete/', ChargeOptionDeleteView.as_view(), name='charge-options-delete'),
    
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
    
    # グッズ管理関連
    path('admin/goods/', goods_management_list, name='goods-management-list'),
    path('admin/goods/<int:goods_id>/', goods_management_detail, name='goods-management-detail'),
    path('admin/goods/<int:goods_id>/update/', goods_management_update, name='goods-management-update'),
    path('admin/goods/sync-suzuri/', sync_suzuri_items, name='sync-suzuri-items'),
    path('goods/public/', public_goods_list, name='public-goods-list'),
    
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
    path('phone-login/check-exists/', check_phone_user_exists, name='phone-login-check-exists'),
    
    # Firebase認証関連
    path('firebase-auth/check-user/', check_user_exists, name='firebase-check-user'),
    path('firebase-auth/user-info/', get_or_create_user_info, name='firebase-user-info'),
    path('firebase-auth/validate/', validate_firebase_user, name='firebase-validate'),
    
    # AWS SMS認証関連
    path('aws-sms-auth/send/', AWSSMSAuthView.as_view(), name='aws-sms-send'),
    path('aws-sms-auth/verify/', AWSSMSVerifyView.as_view(), name='aws-sms-verify'),
    path('aws-sms-auth/user-info/', AWSSMSUserInfoView.as_view(), name='aws-sms-user-info'),
    
    # 統一クレジットシステム関連
    path('unified-credits/', get_user_credits, name='unified-credits'),
    path('unified-credits/history/', get_credit_history, name='unified-credit-history'),
    path('unified-credits/consume/', consume_credits, name='unified-credit-consume'),
    path('unified-credits/migrate/', migrate_phone_user, name='unified-credit-migrate'),
    
    # 管理者用クレジット管理
    path('admin/credits/add/', add_credits_to_user, name='admin-add-credits'),
    path('admin/credits/check/', admin_get_user_credits, name='admin-check-credits'),
    path('admin/users/delete/', delete_user, name='admin-delete-user'),
    path('admin/users/', get_all_users, name='admin-get-all-users'),
    
    # 生成履歴管理
    path('admin/generation-history/stats/', get_generation_history_stats, name='generation-history-stats'),
    path('admin/generation-history/list/', get_generation_history_list, name='generation-history-list'),
    

    
    # データベースマイグレーション（本番環境用）
    path('admin/migrate/', run_migrations, name='admin-migrate'),
    path('admin/migrate/status/', migration_status, name='admin-migrate-status'),
    path('admin/db/inspect/', inspect_database_tables, name='admin-db-inspect'),
    
    # データベース接続テスト
    path('db-test/', db_connection_test, name='db-connection-test'),
    
    # Stripe Webhook（本番環境用）
    path('stripe/webhook/', stripe_webhook, name='stripe-webhook'),
    
    # 売上管理関連
    path('sales/monthly-summary/', SalesManagementView.as_view(), name='sales-monthly-summary'),
    path('sales/monthly-details/', SalesMonthlyDetailView.as_view(), name='sales-monthly-details'),
    
    # MyGarage認証関連
    path('mygarage-auth/register/', register_mygarage_user, name='mygarage-register'),
]
