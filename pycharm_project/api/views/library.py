from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from django.shortcuts import get_object_or_404
from django.db.models import Q
import logging

from api.models.library import Library
from api.serializers.library import LibrarySerializer, LibraryCreateUpdateSerializer
from api.services.gcs_upload_service import gcs_upload_service

logger = logging.getLogger(__name__)


class TimelineListCreateView(ListCreateAPIView):
    """
    タイムラインの一覧取得・作成
    GET /api/timeline/ - ユーザーのタイムライン一覧を取得
    POST /api/timeline/ - タイムラインに画像を保存（生成時）
    """
    serializer_class = LibrarySerializer
    
    def get_queryset(self):
        """
        ユーザーIDに基づいてタイムラインを絞り込み
        フィルタオプション：
        - saved_only=true: ライブラリ保存済みのみ
        - public_only=true: 公開画像のみ
        """
        user_id = self.request.query_params.get('user_id')
        saved_only = self.request.query_params.get('saved_only', 'false').lower() == 'true'
        public_only = self.request.query_params.get('public_only', 'false').lower() == 'true'
        
        if not user_id:
            return Library.objects.none()
        
        queryset = Library.objects.filter(user_id=user_id)
        
        if saved_only:
            queryset = queryset.filter(is_saved_to_library=True)
        
        if public_only:
            queryset = queryset.filter(is_public=True)
        
        # prefetch_related でコメント・いいねを効率的に取得（N+1クエリ問題を解決）
        return queryset.prefetch_related('comments', 'likes').order_by('-timestamp')
    
    def post(self, request, *args, **kwargs):
        """
        タイムラインに画像を保存（生成時またはライブラリ保存時）
        GCPアップロード付き
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
                validated_data = serializer.validated_data
                validated_data['user_id'] = user_id
                
                # デバッグ: validated_dataの内容を確認
                logger.info(f"📋 validated_data: {validated_data}")
                
                # 重複チェック
                existing_entry = Library.objects.filter(
                    user_id=user_id, 
                    frontend_id=validated_data.get('frontend_id')
                ).first()
                
                if existing_entry:
                    logger.warning(f"重複画像の保存試行: user_id={user_id}, frontend_id={validated_data.get('frontend_id')}")
                    return Response(
                        {'error': 'この画像は既にタイムラインに保存されています'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # 元の画像URLを取得
                original_image_url = validated_data.get('image_url')
                frontend_id = validated_data.get('frontend_id')
                
                if original_image_url and frontend_id:
                    logger.info(f"🖼️ === ライブラリ画像GCSアップロード開始 ===")
                    logger.info(f"📤 original_image_url: {original_image_url}")
                    logger.info(f"👤 user_id: {user_id}")
                    logger.info(f"🆔 frontend_id: {frontend_id}")
                    
                    # 環境変数の状態をログ出力
                    import os
                    google_creds = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
                    logger.info(f"🔑 GOOGLE_APPLICATION_CREDENTIALS: {google_creds}")
                    
                    try:
                        # 画像をGCPにアップロード
                        logger.info("☁️ GCS Upload Service呼び出し開始...")
                        gcp_image_url = gcs_upload_service.upload_generated_image_from_url(
                            original_image_url, 
                            user_id, 
                            frontend_id
                        )
                        
                        # GCPのURLで置き換え
                        validated_data['image_url'] = gcp_image_url
                        logger.info(f"✅ ライブラリ画像GCSアップロード成功!")
                        logger.info(f"🔗 gcp_image_url: {gcp_image_url}")
                        
                    except Exception as gcp_error:
                        logger.error(f"❌ === ライブラリ画像GCSアップロードエラー ===")
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
                        
                        # GCPアップロードに失敗した場合は元のURLを使用
                        logger.info("⚠️ 元の画像URLを使用してタイムラインに保存します")
                else:
                    logger.info("📷 画像URLまたはfrontend_idが見つからないため、GCSアップロードをスキップします")
                
                # タイムラインエントリを作成
                timeline_entry = Library.objects.create(**validated_data)
                
                # レスポンス用のシリアライザーで返却
                response_serializer = LibrarySerializer(timeline_entry)
                logger.info(f"✅ タイムライン保存成功: user_id={user_id}, frontend_id={frontend_id}")
                
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                logger.error(f"❌ タイムライン保存エラー: {e}")
                return Response(
                    {'error': 'タイムライン保存に失敗しました'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            logger.error(f"タイムライン保存 - バリデーションエラー: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TimelineDetailView(RetrieveUpdateDestroyAPIView):
    """
    タイムラインの詳細取得・更新・削除
    GET /api/timeline/{frontend_id}/ - タイムライン詳細を取得
    PUT /api/timeline/{frontend_id}/ - タイムライン更新（ライブラリフラグ、評価等）
    DELETE /api/timeline/{frontend_id}/ - タイムラインから削除
    """
    serializer_class = LibrarySerializer
    lookup_field = 'frontend_id'  # フロントエンドIDで検索
    
    def get_queryset(self):
        """
        ユーザー権限に基づいてアクセス可能なタイムラインを取得
        """
        user_id = self.request.query_params.get('user_id')
        if not user_id:
            return Library.objects.none()
        
        # 自分のタイムラインまたは公開されたタイムラインのみアクセス可能
        # prefetch_related でコメント・いいねを効率的に取得（N+1クエリ問題を解決）
        return Library.objects.filter(
            Q(user_id=user_id) | Q(is_public=True)
        ).prefetch_related('comments', 'likes')
    
    def put(self, request, *args, **kwargs):
        """
        タイムラインエントリを更新（ライブラリフラグ、評価・公開設定等）
        """
        frontend_id = kwargs.get('frontend_id')  # フロントエンドIDを取得
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_idが必要です'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # 自分のタイムラインのみ更新可能
            timeline_entry = get_object_or_404(
                Library, 
                frontend_id=frontend_id, 
                user_id=user_id
            )
            
            # 部分更新対応
            serializer = LibraryCreateUpdateSerializer(
                timeline_entry, 
                data=request.data, 
                partial=True
            )
            
            if serializer.is_valid():
                updated_entry = serializer.save()
                
                # レスポンス用のシリアライザーで返却
                response_serializer = LibrarySerializer(updated_entry)
                logger.info(f"タイムライン更新成功: frontend_id={frontend_id}, user_id={user_id}")
                
                return Response(response_serializer.data, status=status.HTTP_200_OK)
            else:
                logger.error(f"タイムライン更新 - バリデーションエラー: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Library.DoesNotExist:
            return Response(
                {'error': 'タイムラインエントリが見つかりません'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"タイムライン更新エラー: {e}")
            return Response(
                {'error': 'タイムライン更新に失敗しました'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def delete(self, request, *args, **kwargs):
        """
        タイムラインから削除（GCP画像も削除）
        """
        frontend_id = kwargs.get('frontend_id')  # フロントエンドIDを取得
        user_id = request.query_params.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_idが必要です'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # 自分のタイムラインのみ削除可能
            timeline_entry = get_object_or_404(
                Library, 
                frontend_id=frontend_id, 
                user_id=user_id
            )
            
            # GCPから画像を削除
            image_url = timeline_entry.image_url
            if image_url and 'storage.googleapis.com' in image_url:
                try:
                    logger.info(f"🗑️ GCP画像削除開始: {image_url}")
                    delete_result = gcs_upload_service.delete_generated_image(image_url)
                    logger.info(f"🗑️ GCP画像削除結果: {delete_result}")
                except Exception as gcp_error:
                    logger.error(f"❌ GCP画像削除エラー: {gcp_error}")
                    # GCP削除に失敗してもデータベースからは削除
            
            timeline_entry.delete()
            logger.info(f"✅ タイムライン削除成功: frontend_id={frontend_id}, user_id={user_id}")
            
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except Library.DoesNotExist:
            return Response(
                {'error': 'タイムラインエントリが見つかりません'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"タイムライン削除エラー: {e}")
            return Response(
                {'error': 'タイムライン削除に失敗しました'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PublicTimelineListView(APIView):
    """
    公開タイムラインの取得（公開画像表示用）
    GET /api/timeline/public/ - 公開されているタイムライン一覧を取得
    """
    
    def get(self, request):
        """
        公開されているタイムライン一覧を取得
        """
        try:
            # 公開設定されているタイムラインのみ取得
            # prefetch_related でコメント・いいねを効率的に取得（N+1クエリ問題を解決）
            public_timeline = Library.objects.filter(
                is_public=True
            ).prefetch_related('comments', 'likes').order_by('-timestamp')[:50]  # 最新50件
            
            serializer = LibrarySerializer(public_timeline, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"公開タイムライン取得エラー: {e}")
            return Response(
                {'error': '公開タイムラインの取得に失敗しました'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 