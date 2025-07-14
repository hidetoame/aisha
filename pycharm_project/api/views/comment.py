from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import ListCreateAPIView, DestroyAPIView
from django.shortcuts import get_object_or_404
from django.db.models import Q
import logging

from api.models import Library, Comment, Like
from api.serializers.comment import CommentSerializer, CommentCreateSerializer, LikeSerializer

logger = logging.getLogger(__name__)


class CommentListCreateView(ListCreateAPIView):
    """
    ライブラリ画像のコメント一覧取得・作成
    GET /api/timeline/{frontend_id}/comments/ - コメント一覧を取得
    POST /api/timeline/{frontend_id}/comments/ - コメントを作成
    """
    serializer_class = CommentSerializer
    
    def get_queryset(self):
        """frontend_idに基づいてコメントを取得"""
        frontend_id = self.kwargs.get('frontend_id')
        try:
            library = Library.objects.get(frontend_id=frontend_id)
            return Comment.objects.filter(library=library).order_by('created_at')
        except Library.DoesNotExist:
            return Comment.objects.none()
    
    def post(self, request, *args, **kwargs):
        """コメントを作成"""
        frontend_id = kwargs.get('frontend_id')
        user_id = request.data.get('user_id')
        user_name = request.data.get('user_name')
        
        if not user_id:
            return Response(
                {'error': 'user_idが必要です'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not user_name:
            return Response(
                {'error': 'user_nameが必要です'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # ライブラリの存在確認
            library = get_object_or_404(Library, frontend_id=frontend_id)
            
            # コメント作成用シリアライザーでバリデーション
            serializer = CommentCreateSerializer(data=request.data)
            if serializer.is_valid():
                # コメントを作成
                comment = Comment.objects.create(
                    library=library,
                    user_id=user_id,
                    user_name=user_name,
                    content=serializer.validated_data['content']
                )
                
                # レスポンス用シリアライザーで返却
                response_serializer = CommentSerializer(comment)
                logger.info(f"コメント作成成功: frontend_id={frontend_id}, user_id={user_id}")
                
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Library.DoesNotExist:
            return Response(
                {'error': 'ライブラリが見つかりません'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"コメント作成エラー: {e}")
            return Response(
                {'error': 'コメントの作成に失敗しました'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CommentDeleteView(DestroyAPIView):
    """
    コメント削除
    DELETE /api/timeline/{frontend_id}/comments/{comment_id}/ - コメントを削除
    """
    
    def delete(self, request, *args, **kwargs):
        """コメントを削除（作成者のみ）"""
        frontend_id = kwargs.get('frontend_id')
        comment_id = kwargs.get('comment_id')
        user_id = request.query_params.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_idが必要です'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # frontend_idからlibraryを取得
            library = get_object_or_404(Library, frontend_id=frontend_id)
            
            # 自分のコメントのみ削除可能
            comment = get_object_or_404(
                Comment, 
                id=comment_id, 
                library=library, 
                user_id=user_id
            )
            
            comment.delete()
            logger.info(f"コメント削除成功: comment_id={comment_id}, user_id={user_id}")
            
            return Response(
                {'message': 'コメントを削除しました'}, 
                status=status.HTTP_204_NO_CONTENT
            )
            
        except Comment.DoesNotExist:
            return Response(
                {'error': 'コメントが見つかりません'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"コメント削除エラー: {e}")
            return Response(
                {'error': 'コメントの削除に失敗しました'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LikeToggleView(APIView):
    """
    いいねのトグル（いいね/いいね解除）
    POST /api/timeline/{frontend_id}/like/ - いいねをトグル
    """
    
    def post(self, request, *args, **kwargs):
        """いいねをトグル（いいね/いいね解除）"""
        frontend_id = kwargs.get('frontend_id')
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_idが必要です'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # ライブラリの存在確認
            library = get_object_or_404(Library, frontend_id=frontend_id)
            
            # 既存のいいねを確認
            existing_like = Like.objects.filter(
                library=library, 
                user_id=user_id
            ).first()
            
            if existing_like:
                # いいね解除
                existing_like.delete()
                logger.info(f"いいね解除: frontend_id={frontend_id}, user_id={user_id}")
                return Response(
                    {
                        'message': 'いいねを解除しました',
                        'liked': False,
                        'like_count': library.get_like_count()
                    }, 
                    status=status.HTTP_200_OK
                )
            else:
                # いいね追加
                Like.objects.create(library=library, user_id=user_id)
                logger.info(f"いいね追加: frontend_id={frontend_id}, user_id={user_id}")
                return Response(
                    {
                        'message': 'いいねしました',
                        'liked': True,
                        'like_count': library.get_like_count()
                    }, 
                    status=status.HTTP_201_CREATED
                )
                
        except Library.DoesNotExist:
            return Response(
                {'error': 'ライブラリが見つかりません'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"いいねトグルエラー: {e}")
            return Response(
                {'error': 'いいねの処理に失敗しました'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LikeStatusView(APIView):
    """
    いいね状態の確認
    GET /api/timeline/{frontend_id}/like/status/ - いいね状態を取得
    """
    
    def get(self, request, *args, **kwargs):
        """いいね状態を取得"""
        frontend_id = kwargs.get('frontend_id')
        user_id = request.query_params.get('user_id')
        
        try:
            # ライブラリの存在確認
            library = get_object_or_404(Library, frontend_id=frontend_id)
            
            # いいね状態を確認
            is_liked = False
            if user_id:
                is_liked = library.is_liked_by_user(user_id)
            
            return Response(
                {
                    'liked': is_liked,
                    'like_count': library.get_like_count()
                }, 
                status=status.HTTP_200_OK
            )
            
        except Library.DoesNotExist:
            return Response(
                {'error': 'ライブラリが見つかりません'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"いいね状態取得エラー: {e}")
            return Response(
                {'error': 'いいね状態の取得に失敗しました'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )