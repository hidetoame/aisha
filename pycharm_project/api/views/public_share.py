from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
import logging

from api.models.library import Library
from api.serializers.library import LibrarySerializer

logger = logging.getLogger(__name__)


class PublicTimelineShareView(APIView):
    """
    公開共有用のタイムライン詳細取得（認証不要）
    GET /api/timeline/share/{frontend_id}/ - 公開設定された画像のみ取得
    """
    authentication_classes = []  # 認証不要
    permission_classes = []  # パーミッション不要
    
    def get(self, request, frontend_id):
        """
        公開設定されたタイムライン詳細を取得
        """
        try:
            # frontend_idで検索し、公開設定されているもののみ取得
            timeline_entry = get_object_or_404(
                Library, 
                frontend_id=frontend_id, 
                is_public=True  # 公開フラグがTrueのもののみ
            )
            
            # 公開用のデータのみを含むレスポンス
            # 個人情報（user_id等）は除外
            public_data = {
                'frontend_id': timeline_entry.frontend_id,
                'image_url': timeline_entry.image_url,
                'display_prompt': timeline_entry.display_prompt,
                'menu_name': timeline_entry.menu_name,
                'timestamp': timeline_entry.timestamp,
                'rating': timeline_entry.rating,
                'author_name': timeline_entry.author_name,
            }
            
            logger.info(f"公開画像共有アクセス: frontend_id={frontend_id}")
            
            return Response(public_data, status=status.HTTP_200_OK)
            
        except Library.DoesNotExist:
            logger.warning(f"公開画像が見つかりません: frontend_id={frontend_id}")
            return Response(
                {'error': '画像が見つかりません'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"公開画像取得エラー: {e}")
            return Response(
                {'error': '画像の取得に失敗しました'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )