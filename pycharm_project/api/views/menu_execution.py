import logging
import uuid
import os

from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models.menu import Menu
from api.serializers.menu_execution.request import MenuExecutionRequestSerializer
from api.serializers.menu_execution.response import MenuExecutionResponseSerializer
from api.services.unified_credit_service import UnifiedCreditService
from api.services.tsukuruma_api_execution import generate_or_edit
from api.services.gcs_upload_service import gcs_upload_service

logger = logging.getLogger(__name__)


class MenuExecutionView(APIView):
    # NOTE menu_idはURLから取得
    def post(self, request, menu_id):
        # 指定されたIDのMenuモデルのインスタンスを取得
        instance = get_object_or_404(Menu, pk=menu_id)

        # リクエストパラメータ取得
        serializer = MenuExecutionRequestSerializer(data=request.data, context={"menu_id": menu_id})
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        logger.info(f"request parameters: {validated_data}")

        # ユーザーIDを取得
        user_id = request.data.get('user_id', 'anonymous')
        
        # クレジット消費処理（メニュー実行前）
        if user_id != 'anonymous':
            # メニューの必要クレジット数（デフォルト1、設定可能にする場合はMenuモデルにフィールド追加）
            required_credits = getattr(instance, 'required_credits', 1)
            
            logger.info(f"💳 クレジット消費開始: user_id={user_id}, required_credits={required_credits}")
            success, message = UnifiedCreditService.consume_credits(
                user_id=user_id,
                amount=required_credits,
                description=f"メニュー実行: {instance.name}"
            )
            
            if not success:
                logger.error(f"❌ クレジット消費失敗: {message}")
                return Response({
                    'success': False,
                    'error': f'クレジット不足: {message}'
                }, status=400)
            
            logger.info(f"✅ クレジット消費成功: {message}")
        else:
            logger.warning("⚠️ 匿名ユーザーのためクレジット消費をスキップ")

        # ビジネスロジック
        result, prompt_formatted = generate_or_edit(instance, **validated_data)

        # レスポンスパラメータ整形
        if result.success:
            response_data = {**result.data, "prompt_formatted": prompt_formatted}
            
            # 画像URLをGCSにアップロードしてパブリックURLに変換
            original_image_url = response_data.get("image_presigned_url_1")
            if original_image_url:
                try:
                    # ユーザーIDを取得（リクエストから）
                    user_id = request.data.get('user_id', 'anonymous')
                    frontend_id = str(uuid.uuid4())
                    
                    logger.info(f"🖼️ === メニュー実行画像のGCSアップロード開始 ===")
                    logger.info(f"📤 original_image_url: {original_image_url}")
                    logger.info(f"👤 user_id: {user_id}")
                    logger.info(f"🆔 frontend_id: {frontend_id}")
                    
                    # 環境変数の状態をログ出力
                    google_creds = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
                    logger.info(f"🔑 GOOGLE_APPLICATION_CREDENTIALS: {google_creds}")
                    
                    # GCSにアップロード
                    logger.info("☁️ GCS Upload Service呼び出し開始...")
                    gcp_image_url = gcs_upload_service.upload_generated_image_from_url(
                        original_image_url, 
                        user_id, 
                        frontend_id
                    )
                    
                    # GCPのパブリックURLに置き換え
                    response_data["image_presigned_url_1"] = gcp_image_url
                    logger.info(f"✅ メニュー実行画像のGCSアップロード成功!")
                    logger.info(f"🔗 gcp_image_url: {gcp_image_url}")
                    
                except Exception as gcp_error:
                    logger.error(f"❌ === メニュー実行画像のGCSアップロードエラー ===")
                    logger.error(f"💥 エラータイプ: {type(gcp_error).__name__}")
                    logger.error(f"💥 エラーメッセージ: {str(gcp_error)}")
                    logger.error(f"💥 エラー詳細: {gcp_error}")
                    
                    # Firebase関連エラーかチェック
                    error_str = str(gcp_error).lower()
                    if any(keyword in error_str for keyword in ['firebase', 'credential', 'authentication']):
                        logger.error("🔥 Firebase認証競合の可能性あり!")
                    
                    # 環境変数も再度チェック
                    google_creds = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
                    logger.error(f"🔑 エラー時のGOOGLE_APPLICATION_CREDENTIALS: {google_creds}")
                    
                    logger.info("⚠️ 元の画像URLを使用します")
            else:
                logger.info("📷 画像URLが見つからないため、GCSアップロードをスキップします")
            
            response_data = MenuExecutionResponseSerializer(instance=response_data).data
        else:
            response_data = {"error": result.error}
        logger.info(f"response data: {response_data}")

        return Response(data=response_data, status=result.status_code)
