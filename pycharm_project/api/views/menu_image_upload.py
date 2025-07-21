import logging
import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from api.services.gcs_upload_service import gcs_upload_service

logger = logging.getLogger(__name__)


class MenuImageUploadView(APIView):
    """
    メニュー管理用の画像アップロードAPI
    サンプル画像をGCSにアップロードしてパブリックURLを返す
    """
    parser_classes = (MultiPartParser, FormParser)
    
    def post(self, request):
        """
        画像ファイルをGCSにアップロード
        
        Parameters:
        - image: アップロードしたい画像ファイル
        - image_type: 画像タイプ ('sample_input' または 'sample_result')
        """
        image_file = request.FILES.get('image')
        image_type = request.data.get('image_type', 'sample_input')
        
        if not image_file:
            return Response(
                {'error': '画像ファイルが必要です'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # ファイルサイズチェック（10MB制限）
        if image_file.size > 10 * 1024 * 1024:
            return Response(
                {'error': 'ファイルサイズは10MB以下にしてください'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # ファイル形式チェック
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
        if image_file.content_type not in allowed_types:
            return Response(
                {'error': '対応していないファイル形式です。JPEG、PNG、GIFのみ対応しています'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # メニュー管理用のユニークIDを生成
            frontend_id = f"menu_sample_{image_type}_{str(uuid.uuid4())}"
            
            logger.info(f"🖼️ メニューサンプル画像アップロード開始: {image_file.name}, タイプ: {image_type}")
            
            # ファイルをバイトデータとして読み込み
            image_data = image_file.read()
            file_extension = self._get_file_extension(image_file.name)
            
            # GCSにアップロード
            gcp_image_url = gcs_upload_service.upload_image_from_bytes(
                image_data,
                'admin',  # 管理者用
                frontend_id,
                file_extension
            )
            
            logger.info(f"✅ メニューサンプル画像アップロード成功: {gcp_image_url}")
            
            return Response(
                {
                    'public_url': gcp_image_url,
                    'image_type': image_type,
                    'filename': image_file.name
                }, 
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"❌ メニューサンプル画像アップロードエラー: {e}")
            return Response(
                {'error': '画像のアップロードに失敗しました', 'details': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_file_extension(self, filename: str) -> str:
        """ファイル名から拡張子を取得"""
        if '.' in filename:
            return '.' + filename.rsplit('.', 1)[1].lower()
        return '.jpg'  # デフォルト 