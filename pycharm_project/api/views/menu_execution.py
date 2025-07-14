import logging
import uuid

from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models.menu import Menu
from api.serializers.menu_execution.request import MenuExecutionRequestSerializer
from api.serializers.menu_execution.response import MenuExecutionResponseSerializer
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
                    
                    logger.info(f"🖼️ メニュー実行画像のGCPアップロード開始: {original_image_url}")
                    
                    # GCSにアップロード
                    gcp_image_url = gcs_upload_service.upload_generated_image_from_url(
                        original_image_url, 
                        user_id, 
                        frontend_id
                    )
                    
                    # GCPのパブリックURLに置き換え
                    response_data["image_presigned_url_1"] = gcp_image_url
                    logger.info(f"✅ メニュー実行画像のGCPアップロード成功: {gcp_image_url}")
                    
                except Exception as gcp_error:
                    logger.error(f"❌ メニュー実行画像のGCPアップロードエラー: {gcp_error}")
                    logger.info("⚠️ 元の画像URLを使用します")
            
            response_data = MenuExecutionResponseSerializer(instance=response_data).data
        else:
            response_data = {"error": result.error}
        logger.info(f"response data: {response_data}")

        return Response(data=response_data, status=result.status_code)
