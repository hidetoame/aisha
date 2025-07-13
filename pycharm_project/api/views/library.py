from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from django.shortcuts import get_object_or_404
from django.db.models import Q
import logging

from api.models.library import Library
from api.serializers.library import LibrarySerializer, LibraryCreateUpdateSerializer

logger = logging.getLogger(__name__)


class LibraryListCreateView(ListCreateAPIView):
    """
    ライブラリの一覧取得・作成
    GET /api/library/ - ユーザーのライブラリ一覧を取得
    POST /api/library/ - ライブラリに画像を保存
    """
    serializer_class = LibrarySerializer
    
    def get_queryset(self):
        """
        ユーザーIDに基づいてライブラリを絞り込み
        """
        user_id = self.request.query_params.get('user_id')
        if not user_id:
            return Library.objects.none()
        
        # 自分のライブラリまたは公開されたライブラリを取得
        return Library.objects.filter(
            Q(user_id=user_id) | Q(is_public=True)
        ).order_by('-timestamp')
    
    def post(self, request, *args, **kwargs):
        """
        ライブラリに画像を保存
        """
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_idが必要です'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # シリアライザーでデータを検証
        serializer = LibraryCreateUpdateSerializer(data=request.data)
        if serializer.is_valid():
            try:
                # user_idを追加してライブラリエントリを作成
                validated_data = serializer.validated_data
                validated_data['user_id'] = user_id
                
                library_entry = Library.objects.create(**validated_data)
                
                # レスポンス用のシリアライザーで返却
                response_serializer = LibrarySerializer(library_entry)
                logger.info(f"ライブラリ保存成功: user_id={user_id}, frontend_id={validated_data.get('frontend_id')}")
                
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                logger.error(f"ライブラリ保存エラー: {e}")
                return Response(
                    {'error': 'ライブラリ保存に失敗しました'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            logger.error(f"ライブラリ保存 - バリデーションエラー: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LibraryDetailView(RetrieveUpdateDestroyAPIView):
    """
    ライブラリの詳細取得・更新・削除
    GET /api/library/{id}/ - ライブラリ詳細を取得
    PUT /api/library/{id}/ - ライブラリを更新
    DELETE /api/library/{id}/ - ライブラリから削除
    """
    serializer_class = LibrarySerializer
    lookup_field = 'frontend_id'  # フロントエンドのIDで検索
    
    def get_queryset(self):
        """
        ユーザー権限に基づいてアクセス可能なライブラリを取得
        """
        user_id = self.request.query_params.get('user_id')
        if not user_id:
            return Library.objects.none()
        
        # 自分のライブラリまたは公開されたライブラリのみアクセス可能
        return Library.objects.filter(
            Q(user_id=user_id) | Q(is_public=True)
        )
    
    def put(self, request, *args, **kwargs):
        """
        ライブラリエントリを更新（評価・公開設定等）
        """
        frontend_id = kwargs.get('frontend_id')
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_idが必要です'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # 自分のライブラリのみ更新可能
            library_entry = get_object_or_404(
                Library, 
                frontend_id=frontend_id, 
                user_id=user_id
            )
            
            # 部分更新対応
            serializer = LibraryCreateUpdateSerializer(
                library_entry, 
                data=request.data, 
                partial=True
            )
            
            if serializer.is_valid():
                updated_entry = serializer.save()
                
                # レスポンス用のシリアライザーで返却
                response_serializer = LibrarySerializer(updated_entry)
                logger.info(f"ライブラリ更新成功: frontend_id={frontend_id}, user_id={user_id}")
                
                return Response(response_serializer.data, status=status.HTTP_200_OK)
            else:
                logger.error(f"ライブラリ更新 - バリデーションエラー: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Library.DoesNotExist:
            return Response(
                {'error': 'ライブラリエントリが見つかりません'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"ライブラリ更新エラー: {e}")
            return Response(
                {'error': 'ライブラリ更新に失敗しました'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def delete(self, request, *args, **kwargs):
        """
        ライブラリから削除
        """
        frontend_id = kwargs.get('frontend_id')
        user_id = request.query_params.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_idが必要です'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # 自分のライブラリのみ削除可能
            library_entry = get_object_or_404(
                Library, 
                frontend_id=frontend_id, 
                user_id=user_id
            )
            
            library_entry.delete()
            logger.info(f"ライブラリ削除成功: frontend_id={frontend_id}, user_id={user_id}")
            
            return Response(
                {'message': 'ライブラリから削除しました'}, 
                status=status.HTTP_204_NO_CONTENT
            )
            
        except Library.DoesNotExist:
            return Response(
                {'error': 'ライブラリエントリが見つかりません'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"ライブラリ削除エラー: {e}")
            return Response(
                {'error': 'ライブラリ削除に失敗しました'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PublicLibraryListView(APIView):
    """
    公開ライブラリの取得（タイムライン用）
    GET /api/library/public/ - 公開されているライブラリ一覧を取得
    """
    
    def get(self, request):
        """
        公開されているライブラリ一覧を取得
        """
        try:
            # 公開設定されているライブラリのみ取得
            public_libraries = Library.objects.filter(
                is_public=True
            ).order_by('-timestamp')[:50]  # 最新50件
            
            serializer = LibrarySerializer(public_libraries, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"公開ライブラリ取得エラー: {e}")
            return Response(
                {'error': '公開ライブラリの取得に失敗しました'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 