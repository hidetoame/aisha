import logging
import uuid
import os

from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models.menu import Menu
from api.models.library import Library
from api.serializers.menu_execution.request import MenuExecutionRequestSerializer
from api.serializers.menu_execution.response import MenuExecutionResponseSerializer
from api.services.unified_credit_service import UnifiedCreditService
from api.services.tsukuruma_api_execution import generate_or_edit
from api.services.gcs_upload_service import gcs_upload_service
from django.utils import timezone

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
        
        # クレジット消費処理を削除 - フロントエンドで管理するため
        logger.info(f"💳 クレジット消費はフロントエンドで管理: user_id={user_id}")

        # ビジネスロジック
        result, prompt_formatted = generate_or_edit(instance, **validated_data)

        # レスポンスパラメータ整形
        if result.success:
            response_data = {**result.data, "prompt_formatted": prompt_formatted}
            
            # フロントエンドから送信されたデータを取得
            original_image_url = response_data.get("image_presigned_url_1")
            frontend_id = request.data.get('frontend_id')  # フロントエンドから送信されたfrontend_id
            
            if original_image_url and user_id and frontend_id:
                try:
                    logger.info(f"📚 === Libraryテーブルへの保存開始 ===")
                    logger.info(f"📤 original_image_url (S3): {original_image_url}")
                    logger.info(f"👤 user_id: {user_id}")
                    logger.info(f"🆔 frontend_id: {frontend_id}")
                    
                    # まずGCSにアップロード
                    logger.info("☁️ GCS Upload Service呼び出し開始...")
                    gcp_image_url = gcs_upload_service.upload_generated_image_from_url(
                        original_image_url, 
                        user_id, 
                        frontend_id
                    )
                    logger.info(f"✅ GCSアップロード成功: {gcp_image_url}")
                    
                    # フォームデータをシリアライズ可能な形式に変換
                    serializable_form_data = {}
                    for key, value in request.data.items():
                        if hasattr(value, 'read'):  # ファイルの場合
                            serializable_form_data[key] = f"<uploaded_file: {getattr(value, 'name', 'unknown')}>"
                        else:
                            serializable_form_data[key] = value
                    
                    # Libraryテーブルに保存
                    library_entry = Library.objects.create(
                        user_id=user_id,
                        frontend_id=frontend_id,
                        image_url=gcp_image_url,  # GCSのURL
                        display_prompt=prompt_formatted,
                        menu_name=instance.name,
                        used_form_data=serializable_form_data,  # シリアライズ可能なデータ
                        rating=None,
                        is_public=False,
                        author_name=request.data.get('author_name', ''),
                        is_saved_to_library=False,  # 生成時は自動的にfalse
                        timestamp=timezone.now()  # タイムゾーン対応の現在時刻
                    )
                    
                    # GCSのURLをレスポンスに設定
                    response_data["image_presigned_url_1"] = gcp_image_url
                    logger.info(f"✅ Libraryテーブル保存成功 - ID: {library_entry.id}")
                    logger.info(f"🔗 返却するGCS URL: {gcp_image_url}")
                    
                except Exception as error:
                    logger.error(f"❌ === Library保存エラー ===")
                    logger.error(f"💥 エラータイプ: {type(error).__name__}")
                    logger.error(f"💥 エラーメッセージ: {str(error)}")
                    logger.error(f"💥 エラー詳細: {error}")
                    
                    # エラーでも元のS3 URLを使用
                    logger.info("⚠️ エラーのため元のS3 URLを使用します")
            else:
                missing = []
                if not original_image_url:
                    missing.append("image_url")
                if not frontend_id:
                    missing.append("frontend_id")
                if not user_id:
                    missing.append("user_id")
                logger.warning(f"⚠️ 必要な情報が不足: {', '.join(missing)}")
            
            response_data = MenuExecutionResponseSerializer(instance=response_data).data
        else:
            response_data = {"error": result.error}
        logger.info(f"response data: {response_data}")

        return Response(data=response_data, status=result.status_code)
