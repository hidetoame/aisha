import logging
import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from api.services.gcs_upload_service import gcs_upload_service

logger = logging.getLogger(__name__)


class ImageUploadView(APIView):
    """
    既存のローカル画像URLをGCSにアップロードしてパブリックURLを返すAPI
    """
    
    def post(self, request):
        """
        ローカル画像URLをGCSにアップロード
        
        Parameters:
        - image_url: アップロードしたい画像のURL（ローカルホスト）
        - user_id: ユーザーID
        """
        image_url = request.data.get('image_url')
        user_id = request.data.get('user_id', 'anonymous')
        
        if not image_url:
            return Response(
                {'error': 'image_urlが必要です'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # ローカルホストURLの場合のみ処理
        if 'localhost' not in image_url and '127.0.0.1' not in image_url:
            return Response(
                {'public_url': image_url}, 
                status=status.HTTP_200_OK
            )
        
        try:
            frontend_id = str(uuid.uuid4())
            logger.info(f"🖼️ 画像アップロード開始: {image_url}")
            
            # GCSにアップロード
            gcp_image_url = gcs_upload_service.upload_generated_image_from_url(
                image_url, 
                user_id, 
                frontend_id
            )
            
            logger.info(f"✅ 画像アップロード成功: {gcp_image_url}")
            
            return Response(
                {'public_url': gcp_image_url}, 
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"❌ 画像アップロードエラー: {e}")
            return Response(
                {'error': '画像のアップロードに失敗しました', 'details': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
