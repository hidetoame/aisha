from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
import logging

from api.models import Library, PublicComment, Comment
from api.serializers import PublicCommentSerializer
from api.serializers.comment import UnifiedCommentSerializer

logger = logging.getLogger(__name__)


class PublicCommentsView(APIView):
    """
    公開画像へのコメント機能（認証不要）
    GET /api/timeline/share/{frontend_id}/comments/ - コメント一覧取得
    POST /api/timeline/share/{frontend_id}/comments/ - コメント投稿
    """
    authentication_classes = []  # 認証不要
    permission_classes = []  # パーミッション不要
    
    def get(self, request, frontend_id):
        """
        指定された画像のコメント一覧を取得（ログインメンバー + ゲスト）
        """
        try:
            # 公開画像の存在確認
            library_entry = get_object_or_404(
                Library, 
                frontend_id=frontend_id, 
                is_public=True
            )
            
            # ログインメンバーのコメントを取得
            auth_comments = list(Comment.objects.filter(library=library_entry))
            
            # ゲストユーザーのコメントを取得
            guest_comments = list(PublicComment.objects.filter(frontend_id=frontend_id))
            
            # 両方を結合して作成日時でソート
            all_comments = auth_comments + guest_comments
            all_comments.sort(key=lambda x: x.created_at)
            
            # 統合シリアライザーで返す
            serializer = UnifiedCommentSerializer(all_comments, many=True)
            
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Library.DoesNotExist:
            return Response(
                {'error': '画像が見つかりません'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"コメント取得エラー: {e}")
            return Response(
                {'error': 'コメントの取得に失敗しました'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request, frontend_id):
        """
        指定された画像にコメントを投稿
        """
        try:
            # 公開画像の存在確認
            library_entry = get_object_or_404(
                Library, 
                frontend_id=frontend_id, 
                is_public=True
            )
            
            # コメントデータを準備
            data = request.data.copy()
            data['frontend_id'] = frontend_id
            
            serializer = PublicCommentSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                logger.info(f"コメント投稿: frontend_id={frontend_id}, author={data.get('author_name')}")
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except Library.DoesNotExist:
            return Response(
                {'error': '画像が見つかりません'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"コメント投稿エラー: {e}")
            return Response(
                {'error': 'コメントの投稿に失敗しました'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )