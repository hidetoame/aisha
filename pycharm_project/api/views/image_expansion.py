import logging
import uuid
import requests
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view

from api.models.library import Library
from api.services.clipdrop_service import ClipdropService
from api.services.gcs_upload_service import GCSUploadService
from api.serializers.library import LibrarySerializer
from api.serializers.image_expansion import ImageExpansionRequestSerializer
import os
from django.http import JsonResponse

logger = logging.getLogger(__name__)

class ImageExpansionView(APIView):
    """
    画像背景拡張API
    POST /api/image-expansion/ - 指定画像を拡張してタイムラインに保存
    """
    
    def post(self, request):
        """
        画像拡張を実行
        """
        try:
            # リクエストデータのバリデーション
            serializer = ImageExpansionRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {'error': 'バリデーションエラー', 'details': serializer.errors}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # バリデーション済みデータを取得
            validated_data = serializer.validated_data
            image_id = validated_data['image_id']
            anchor_position = validated_data['anchor_position']
            user_id = validated_data['user_id']
            
            # 元画像を取得
            try:
                original_image = Library.objects.get(
                    frontend_id=image_id,
                    user_id=user_id
                )
            except Library.DoesNotExist:
                return Response(
                    {'error': '指定された画像が見つかりません'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            logger.info(f"画像拡張開始: user_id={user_id}, image_id={image_id}, anchor_position={anchor_position}")
            
            # Clipdrop APIキーがあるかチェック
            clipdrop_api_key = os.getenv('CLIPDROP_API_KEY')
            
            if clipdrop_api_key and clipdrop_api_key != 'your_clipdrop_api_key_here':
                # 実際のClipdrop APIを使用
                logger.info("実際のClipdrop APIで画像拡張を実行します")
                try:
                    clipdrop_service = ClipdropService()
                    expanded_image_data = clipdrop_service.expand_image(
                        image_url=original_image.image_url,  # urlではなくimage_url
                        anchor_position=anchor_position
                    )
                    service_type = 'clipdrop'
                    message = '画像拡張が完了しました'
                    menu_name = "背景拡張"
                    display_prefix = "背景拡張"
                except Exception as e:
                    logger.error(f"Clipdrop API エラー: {e}")
                    # Clipdrop APIエラーの場合はモック実装にフォールバック
                    logger.info("Clipdrop APIエラーのため、モック実装を使用します")
                    response = requests.get(original_image.image_url, timeout=30)  # urlではなくimage_url
                    if response.status_code != 200:
                        return Response(
                            {'error': '元画像の取得に失敗しました'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    expanded_image_data = response.content
                    service_type = 'mock_expansion_fallback'
                    message = '[フォールバック] Clipdrop APIエラーのため、モック実装を使用しました'
                    menu_name = "モック背景拡張（フォールバック）"
                    display_prefix = "[フォールバック]背景拡張"
            else:
                # モック実装: 画像拡張をシミュレート（実際には元画像を使用）
                logger.info("Clipdrop APIキーが設定されていないため、モック実装を使用します")
                response = requests.get(original_image.image_url, timeout=30)  # urlではなくimage_url
                if response.status_code != 200:
                    return Response(
                        {'error': '元画像の取得に失敗しました'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                expanded_image_data = response.content
                service_type = 'mock_expansion'
                message = '[モック] 画像拡張をシミュレートしました（実際には元画像と同じです）'
                menu_name = "モック背景拡張"
                display_prefix = "[モック]背景拡張"
            
            # 拡張画像をGCSにアップロード
            new_frontend_id = str(uuid.uuid4().int)[:16]  # 16桁のfrontend_id生成
            
            gcs_service = GCSUploadService()
            expanded_image_url = gcs_service.upload_image_from_bytes(
                image_data=expanded_image_data,
                user_id=user_id,
                frontend_id=new_frontend_id,
                file_extension='.jpg'
            )
            
            # 元の画像のカテゴリ・メニュー情報を取得
            original_form_data = request.data.get('original_form_data', {})
            original_category = original_form_data.get('category')
            original_menu = original_form_data.get('menu')
            
            # メニュー名を元のメニュー名 + （背景拡張）に設定
            if original_menu and original_menu.get('name'):
                menu_name = f"{original_menu['name']}（背景拡張）"
            else:
                menu_name = "背景拡張"
            
            # used_form_dataに元のカテゴリ・メニュー情報を引き継ぐ
            used_form_data = {
                'original_image_id': image_id,
                'anchor_position': anchor_position,
                'expansion_factor': 1.25,
                'api_service': service_type,
                'note': 'モック実装では拡張は行われません' if service_type.startswith('mock') else '実際の拡張処理'
            }
            
            # 元のカテゴリ・メニュー情報があれば引き継ぐ
            if original_category:
                used_form_data['category'] = original_category
            if original_menu:
                used_form_data['menu'] = original_menu
            
            # 新しいタイムラインエントリを作成
            expanded_entry = Library.objects.create(
                user_id=user_id,
                frontend_id=new_frontend_id,
                image_url=expanded_image_url,  # url → image_url に修正
                display_prompt=f"{display_prefix}: {original_image.display_prompt or '元画像'}",
                menu_name=menu_name,
                used_form_data=used_form_data,
                timestamp=datetime.now(),
                rating=None,
                is_public=False,
                author_name=None,
                is_saved_to_library=False  # デフォルトはライブラリ保存なし
            )
            
            logger.info(f"画像拡張完了: 新しいエントリ作成 frontend_id={new_frontend_id}")
            
            # レスポンス用にシリアライズ
            serializer = LibrarySerializer(expanded_entry)
            
            return Response(
                {
                    'success': True,
                    'message': message,
                    'expanded_image': serializer.data,
                    'original_image_id': image_id
                },
                status=status.HTTP_201_CREATED
            )
            
        except ValueError as e:
            logger.error(f"画像拡張エラー (ValueError): {e}")
            return Response(
                {'error': f'画像拡張処理エラー: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"画像拡張エラー (Exception): {e}")
            return Response(
                {'error': '画像拡張中に予期しないエラーが発生しました'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 