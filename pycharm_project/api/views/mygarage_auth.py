import json
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone

from ..models.user_profile import UserProfile
from ..models.credit_charge import UserCredit

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_mygarage_user(request):
    """
    MyGarage認証成功後のユーザー登録処理
    """
    try:
        data = request.data
        
        # 必要なデータの取得
        mygarage_id = data.get('id')  # MyGarageの内部ID（例: 5）
        frontend_user_id = data.get('created_by')  # MyGarageユーザーID（例: 200120）
        nickname = data.get('name')  # ユーザー名（例: Ame♪）
        
        # データの検証
        if not all([mygarage_id, frontend_user_id, nickname]):
            logger.error(f"MyGarage登録エラー: 必要なデータが不足 - id:{mygarage_id}, created_by:{frontend_user_id}, name:{nickname}")
            return Response({
                'success': False,
                'message': '必要なデータが不足しています',
                'error': 'Missing required data',
                'details': {
                    'user_id': frontend_user_id,
                    'operation': 'data_validation_failed'
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 既存ユーザーのチェック（user_profilesテーブルのみチェック）
        try:
            existing_profile = UserProfile.objects.get(frontend_user_id=frontend_user_id)
            logger.info(f"既存ユーザーを発見: {frontend_user_id}")
            return Response({
                'success': True,
                'message': 'ユーザーは既に登録されています',
                'user_id': frontend_user_id,
                'is_new_user': False
            })
        except UserProfile.DoesNotExist:
            # 新規ユーザーの場合
            logger.info(f"新規MyGarageユーザーを登録します: {frontend_user_id}")
        
        # トランザクションでデータベース操作
        with transaction.atomic():
            try:
                # 1. auth_userテーブルにユーザーを作成（または取得）
                from django.contrib.auth.models import User
                user, created = User.objects.get_or_create(
                    username=frontend_user_id,
                    defaults={
                        'email': data.get('email', f'{frontend_user_id}@mygarage.com'),
                        'first_name': nickname,
                        'is_active': True,
                        'last_login': timezone.now(),
                        'date_joined': timezone.now()
                    }
                )
                
                # 2. user_profilesテーブルにデータ挿入（新規ユーザーのみ）
                user_profile = UserProfile.objects.create(
                    user=user,  # auth_userのインスタンスを使用
                    frontend_user_id=frontend_user_id,
                    nickname=nickname,
                    is_admin=False,
                    created_at=timezone.now(),
                    updated_at=timezone.now()
                )
                logger.info(f"user_profiles登録成功: {frontend_user_id}")
                
                # 3. user_creditsテーブルに初期クレジット設定（新規ユーザーのみ）
                try:
                    user_credit = UserCredit.objects.get(user_id=frontend_user_id)
                    logger.info(f"既存ユーザーのクレジット確認: {frontend_user_id} - {user_credit.credit_balance}クレジット")
                except UserCredit.DoesNotExist:
                    # 新規ユーザーの場合のみクレジットを作成
                    user_credit = UserCredit.objects.create(
                        user_id=frontend_user_id,
                        credit_balance=100,  # 初期ボーナスクレジット
                        created_at=timezone.now(),
                        updated_at=timezone.now()
                    )
                    logger.info(f"新規ユーザーのクレジット作成: {frontend_user_id} - 100クレジット")
                
                return Response({
                    'success': True,
                    'message': 'ユーザー登録が完了しました',
                    'user_id': frontend_user_id,
                    'nickname': nickname,
                    'initial_credits': 100,
                    'is_new_user': True
                })
                
            except Exception as e:
                logger.error(f"データベース登録エラー: {str(e)}")
                raise e
                
    except Exception as e:
        logger.error(f"MyGarage登録エラー: {str(e)}")
        return Response({
            'success': False,
            'message': 'ユーザー登録に失敗しました',
            'error': str(e),
            'details': {
                'user_id': frontend_user_id if 'frontend_user_id' in locals() else 'unknown',
                'operation': 'database_insert_failed'
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 