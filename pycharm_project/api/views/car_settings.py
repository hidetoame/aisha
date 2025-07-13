from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db import transaction
import logging

from api.models import CarSettings
from api.serializers.car_settings import CarSettingsSerializer, CarSettingsCreateUpdateSerializer
from api.services.gcs_upload_service import gcs_upload_service

logger = logging.getLogger(__name__)


class CarSettingsListCreateView(APIView):
    """愛車設定一覧取得・作成API"""
    
    parser_classes = [MultiPartParser, FormParser]
    
    def get(self, request):
        """愛車設定一覧取得"""
        try:
            user_id = request.query_params.get('user_id')
            car_id = request.query_params.get('car_id')
            
            if not user_id:
                return Response(
                    {'error': 'user_idパラメータは必須です'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # フィルタリング
            queryset = CarSettings.objects.filter(user_id=user_id)
            if car_id:
                queryset = queryset.filter(car_id=car_id)
            
            car_settings = queryset.order_by('-updated_at')
            serializer = CarSettingsSerializer(car_settings, many=True)
            
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"愛車設定一覧取得エラー: {e}")
            return Response(
                {'error': '愛車設定の取得に失敗しました'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """愛車設定作成"""
        try:
            serializer = CarSettingsCreateUpdateSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {'error': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            data = serializer.validated_data
            user_id = data['user_id']
            car_id = data['car_id']
            
            # 既存の設定があるかチェック
            existing_settings = CarSettings.objects.filter(
                user_id=user_id, 
                car_id=car_id
            ).first()
            
            with transaction.atomic():
                # 既存設定がある場合は更新、ない場合は新規作成
                if existing_settings:
                    car_settings = existing_settings
                else:
                    car_settings = CarSettings(user_id=user_id, car_id=car_id)
                
                # 基本情報更新
                if 'license_plate_text' in data:
                    car_settings.license_plate_text = data['license_plate_text']
                if 'car_name' in data:
                    car_settings.car_name = data['car_name']
                
                # 画像アップロード処理
                image_fields = {
                    'logo_mark_image': 'logo_mark',
                    'original_number_image': 'original_number',
                    'car_photo_front': 'car_photo_front',
                    'car_photo_side': 'car_photo_side',
                    'car_photo_rear': 'car_photo_rear',
                    'car_photo_diagonal': 'car_photo_diagonal',
                }
                
                for field_name, image_type in image_fields.items():
                    if field_name in data and data[field_name]:
                        try:
                            # 既存画像があれば削除
                            existing_url_field = f"{image_type}_image_url" if image_type in ['logo_mark', 'original_number'] else f"{image_type}_url"
                            existing_url = getattr(car_settings, existing_url_field, None)
                            if existing_url:
                                gcs_upload_service.delete_car_setting_image(existing_url)
                            
                            # 新しい画像をアップロード
                            image_url = gcs_upload_service.upload_car_setting_image(
                                data[field_name], 
                                user_id, 
                                car_id, 
                                image_type
                            )
                            setattr(car_settings, existing_url_field, image_url)
                            
                        except Exception as e:
                            logger.error(f"画像アップロードエラー ({field_name}): {e}")
                            return Response(
                                {'error': f'画像アップロードに失敗しました: {field_name}'},
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR
                            )
                
                # 画像削除処理
                delete_fields = {
                    'delete_logo_mark_image': 'logo_mark_image_url',
                    'delete_original_number_image': 'original_number_image_url',
                    'delete_car_photo_front': 'car_photo_front_url',
                    'delete_car_photo_side': 'car_photo_side_url',
                    'delete_car_photo_rear': 'car_photo_rear_url',
                    'delete_car_photo_diagonal': 'car_photo_diagonal_url',
                }
                
                for delete_field, url_field in delete_fields.items():
                    if delete_field in data and data[delete_field] == 'true':
                        try:
                            # 既存画像があれば削除
                            existing_url = getattr(car_settings, url_field, None)
                            if existing_url:
                                gcs_upload_service.delete_car_setting_image(existing_url)
                            # URLフィールドをクリア
                            setattr(car_settings, url_field, None)
                            
                        except Exception as e:
                            logger.error(f"画像削除エラー ({delete_field}): {e}")
                            return Response(
                                {'error': f'画像削除に失敗しました: {delete_field}'},
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR
                            )
                
                car_settings.save()
                
                # レスポンス用シリアライザー
                response_serializer = CarSettingsSerializer(car_settings)
                
                return Response({
                    'success': True,
                    'data': response_serializer.data,
                    'message': '愛車設定を保存しました'
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"愛車設定作成エラー: {e}")
            return Response(
                {'error': '愛車設定の保存に失敗しました'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CarSettingsDetailView(APIView):
    """愛車設定詳細取得・更新・削除API"""
    
    parser_classes = [MultiPartParser, FormParser]
    
    def get(self, request, pk):
        """愛車設定詳細取得"""
        try:
            car_settings = get_object_or_404(CarSettings, pk=pk)
            serializer = CarSettingsSerializer(car_settings)
            
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"愛車設定詳細取得エラー: {e}")
            return Response(
                {'error': '愛車設定の取得に失敗しました'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def put(self, request, pk):
        """愛車設定更新"""
        try:
            car_settings = get_object_or_404(CarSettings, pk=pk)
            serializer = CarSettingsCreateUpdateSerializer(data=request.data)
            
            if not serializer.is_valid():
                return Response(
                    {'error': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            data = serializer.validated_data
            
            with transaction.atomic():
                # 基本情報更新
                if 'license_plate_text' in data:
                    car_settings.license_plate_text = data['license_plate_text']
                if 'car_name' in data:
                    car_settings.car_name = data['car_name']
                
                # 画像アップロード処理（同じロジック）
                image_fields = {
                    'logo_mark_image': 'logo_mark',
                    'original_number_image': 'original_number',
                    'car_photo_front': 'car_photo_front',
                    'car_photo_side': 'car_photo_side',
                    'car_photo_rear': 'car_photo_rear',
                    'car_photo_diagonal': 'car_photo_diagonal',
                }
                
                for field_name, image_type in image_fields.items():
                    if field_name in data and data[field_name]:
                        try:
                            existing_url_field = f"{image_type}_image_url" if image_type in ['logo_mark', 'original_number'] else f"{image_type}_url"
                            existing_url = getattr(car_settings, existing_url_field, None)
                            if existing_url:
                                gcs_upload_service.delete_car_setting_image(existing_url)
                            
                            image_url = gcs_upload_service.upload_car_setting_image(
                                data[field_name], 
                                car_settings.user_id, 
                                car_settings.car_id, 
                                image_type
                            )
                            setattr(car_settings, existing_url_field, image_url)
                            
                        except Exception as e:
                            logger.error(f"画像アップロードエラー ({field_name}): {e}")
                            return Response(
                                {'error': f'画像アップロードに失敗しました: {field_name}'},
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR
                            )
                
                # 画像削除処理（POSTメソッドと同じ処理）
                delete_fields = {
                    'delete_logo_mark_image': 'logo_mark_image_url',
                    'delete_original_number_image': 'original_number_image_url',
                    'delete_car_photo_front': 'car_photo_front_url',
                    'delete_car_photo_side': 'car_photo_side_url',
                    'delete_car_photo_rear': 'car_photo_rear_url',
                    'delete_car_photo_diagonal': 'car_photo_diagonal_url',
                }
                
                logger.info(f"🔍 削除フィールドチェック開始 - 受信データ: {list(data.keys())}")
                
                for delete_field, url_field in delete_fields.items():
                    logger.info(f"🔎 {delete_field}をチェック中...")
                    
                    if delete_field in data:
                        field_value = data[delete_field]
                        logger.info(f"📝 {delete_field}の値: {field_value} (型: {type(field_value)})")
                        
                        # ブール値のtrueまたは文字列の'true'の両方に対応
                        if field_value is True or field_value == 'true' or field_value == True:
                            logger.info(f"✅ {delete_field}の削除処理を開始します")
                            try:
                                # 既存画像があれば削除
                                existing_url = getattr(car_settings, url_field, None)
                                logger.info(f"🖼️ 既存URL: {existing_url}")
                                
                                if existing_url:
                                    logger.info(f"🗑️ GCSから画像削除開始: {existing_url}")
                                    delete_result = gcs_upload_service.delete_car_setting_image(existing_url)
                                    logger.info(f"🗑️ GCS削除結果: {delete_result}")
                                else:
                                    logger.info("⏭️ 削除対象の画像URLが存在しません")
                                
                                # URLフィールドをクリア
                                logger.info(f"🔄 {url_field}をNullに設定中...")
                                setattr(car_settings, url_field, None)
                                logger.info(f"✅ {url_field}をNullに設定しました")
                                
                            except Exception as e:
                                logger.error(f"❌ 画像削除エラー ({delete_field}): {e}")
                                return Response(
                                    {'error': f'画像削除に失敗しました: {delete_field}'},
                                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                                )
                        else:
                            logger.info(f"⏭️ {delete_field}は削除対象外: {field_value}")
                    else:
                        logger.info(f"⏭️ {delete_field}は受信データに含まれていません")
                
                car_settings.save()
                
                response_serializer = CarSettingsSerializer(car_settings)
                
                return Response({
                    'success': True,
                    'data': response_serializer.data,
                    'message': '愛車設定を更新しました'
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"愛車設定更新エラー: {e}")
            return Response(
                {'error': '愛車設定の更新に失敗しました'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def delete(self, request, pk):
        """愛車設定削除"""
        try:
            logger.info(f"🗑️ 愛車設定削除開始: pk={pk}")
            car_settings = get_object_or_404(CarSettings, pk=pk)
            logger.info(f"🔍 削除対象の愛車設定: user_id={car_settings.user_id}, car_id={car_settings.car_id}")
            
            with transaction.atomic():
                # S3から画像を削除
                image_url_fields = [
                    'logo_mark_image_url',
                    'original_number_image_url',
                    'car_photo_front_url',
                    'car_photo_side_url',
                    'car_photo_rear_url',
                    'car_photo_diagonal_url',
                ]
                
                deleted_images = []
                for field_name in image_url_fields:
                    image_url = getattr(car_settings, field_name, None)
                    if image_url:
                        logger.info(f"🖼️ 画像削除処理開始: {field_name}={image_url}")
                        try:
                            result = gcs_upload_service.delete_car_setting_image(image_url)
                            logger.info(f"✅ 画像削除結果: {field_name}={result}")
                            deleted_images.append(f"{field_name}: {result}")
                        except Exception as img_error:
                            logger.error(f"❌ 画像削除エラー {field_name}: {img_error}")
                            deleted_images.append(f"{field_name}: エラー")
                    else:
                        logger.info(f"⏭️ 画像なし: {field_name}")
                
                logger.info(f"📊 削除処理結果: {deleted_images}")
                
                # データベースから削除
                logger.info("🗄️ データベースから愛車設定を削除中...")
                car_settings.delete()
                logger.info("✅ データベース削除完了")
                
                return Response({
                    'success': True,
                    'message': '愛車設定を削除しました',
                    'deleted_images': deleted_images
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"❌ 愛車設定削除エラー: {e}")
            return Response(
                {'error': '愛車設定の削除に失敗しました'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 