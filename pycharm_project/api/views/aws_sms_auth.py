import json
import random
import string
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.views import View
from django.contrib.auth import get_user_model
from django.db import transaction
import boto3
from botocore.exceptions import ClientError
import uuid
from api.models import PhoneUser, PhoneVerificationSession
from api.services.unified_credit_service import UnifiedCreditService
import logging

# boto3のデバッグログを有効化
boto3.set_stream_logger('boto3', logging.DEBUG)
boto3.set_stream_logger('botocore', logging.DEBUG)

logger = logging.getLogger(__name__)

# AWS SNS設定
import os
AWS_REGION = os.getenv('AWS_REGION', 'ap-northeast-1')
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')

class AWSSMSAuthView(View):
    """AWS SNS SMS認証API"""
    
    def __init__(self):
        super().__init__()
        self.sns_client = boto3.client(
            'sns',
            region_name=AWS_REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY
        )
    
    def generate_verification_code(self):
        """6桁の認証コードを生成"""
        return ''.join(random.choices(string.digits, k=6))
    
    def convert_to_international_format(self, phone_number):
        """電話番号を国際形式に変換"""
        # 既存のフォーマット処理と同じロジック
        phone_number = phone_number.replace('-', '').replace(' ', '')
        if phone_number.startswith('090') or phone_number.startswith('080') or phone_number.startswith('070'):
            return '+81' + phone_number[1:]
        elif phone_number.startswith('0'):
            return '+81' + phone_number[1:]
        elif phone_number.startswith('+81'):
            return phone_number
        else:
            return '+81' + phone_number
    
    @method_decorator(csrf_exempt)
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)
    
    def post(self, request):
        """SMS認証コード送信"""
        try:
            data = json.loads(request.body)
            phone_number = data.get('phone_number')
            
            if not phone_number:
                return JsonResponse({'error': '電話番号が必要です'}, status=400)
            
            # 電話番号を国際形式に変換
            international_phone = self.convert_to_international_format(phone_number)
            
            # 認証コード生成
            verification_code = self.generate_verification_code()
            
            # セッション作成または更新
            with transaction.atomic():
                session, created = PhoneVerificationSession.objects.get_or_create(
                    phone_number=phone_number,
                    defaults={
                        'session_id': str(uuid.uuid4()),
                        'verification_code': verification_code,
                        'expires_at': timezone.now() + timedelta(minutes=5),
                        'attempts': 0
                    }
                )
                
                if not created:
                    # 既存セッションを更新
                    session.verification_code = verification_code
                    session.expires_at = timezone.now() + timedelta(minutes=5)
                    session.attempts = 0
                    session.save()
            
            # AWS SNS経由でSMS送信
            message = f"AISHA認証コード: {verification_code}\n有効期限: 5分"
            
            try:
                logger.info(f"SMS送信開始: {international_phone} へ '{message}' を送信")
                
                response = self.sns_client.publish(
                    PhoneNumber=international_phone,
                    Message=message
                )
                
                # 詳細なレスポンスログを追加
                logger.info(f"AWS SNS完全レスポンス: {response}")
                logger.info(f"MessageId: {response.get('MessageId', 'N/A')}")
                logger.info(f"ResponseMetadata: {response.get('ResponseMetadata', {})}")
                
                # HTTPステータスコードを確認
                http_status = response.get('ResponseMetadata', {}).get('HTTPStatusCode', 'Unknown')
                logger.info(f"AWS SNS HTTPステータス: {http_status}")
                
                if http_status == 200:
                    logger.info(f"SMS送信成功: {response['MessageId']} to {international_phone}")
                else:
                    logger.warning(f"SMS送信：HTTPステータス異常 {http_status}")
                
                return JsonResponse({
                    'success': True,
                    'session_id': session.session_id,
                    'message': 'SMS認証コードを送信しました',
                    'expires_in': 300,  # 5分
                    'debug_info': {
                        'message_id': response.get('MessageId'),
                        'http_status': http_status,
                        'phone_number': international_phone
                    }
                })
                
            except ClientError as e:
                logger.error(f"AWS SNS ClientError: {str(e)}")
                logger.error(f"エラーコード: {e.response.get('Error', {}).get('Code', 'Unknown')}")
                logger.error(f"エラーメッセージ: {e.response.get('Error', {}).get('Message', 'Unknown')}")
                logger.error(f"HTTPステータス: {e.response.get('ResponseMetadata', {}).get('HTTPStatusCode', 'Unknown')}")
                return JsonResponse({'error': 'SMS送信に失敗しました'}, status=500)
            except Exception as e:
                logger.error(f"予期しないエラー: {str(e)}")
                logger.error(f"エラータイプ: {type(e).__name__}")
                import traceback
                logger.error(f"トレースバック: {traceback.format_exc()}")
                return JsonResponse({'error': 'SMS送信に失敗しました'}, status=500)
            
        except json.JSONDecodeError:
            return JsonResponse({'error': '不正なJSONデータです'}, status=400)
        except Exception as e:
            logger.error(f"SMS認証エラー: {str(e)}")
            return JsonResponse({'error': 'サーバーエラーが発生しました'}, status=500)


class AWSSMSVerifyView(View):
    """AWS SNS SMS認証コード検証API"""
    
    @method_decorator(csrf_exempt)
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)
    
    def post(self, request):
        """SMS認証コード検証"""
        try:
            data = json.loads(request.body)
            session_id = data.get('session_id')
            verification_code = data.get('verification_code')
            phone_number = data.get('phone_number')
            
            if not all([session_id, verification_code, phone_number]):
                return JsonResponse({'error': '必要な情報が不足しています'}, status=400)
            
            # セッション検証
            try:
                session = PhoneVerificationSession.objects.get(
                    session_id=session_id,
                    phone_number=phone_number
                )
            except PhoneVerificationSession.DoesNotExist:
                return JsonResponse({'error': '無効なセッションです'}, status=400)
            
            # 有効期限チェック
            if session.expires_at < timezone.now():
                return JsonResponse({'error': '認証コードの有効期限が切れています'}, status=400)
            
            # 試行回数チェック
            if session.attempts >= 3:
                return JsonResponse({'error': '認証試行回数が上限に達しました'}, status=400)
            
            # 認証コード検証
            if session.verification_code != verification_code:
                session.attempts += 1
                session.save()
                return JsonResponse({'error': '認証コードが正しくありません'}, status=400)
            
            # 認証成功 - ユーザー作成または取得
            with transaction.atomic():
                phone_user, created = PhoneUser.objects.get_or_create(
                    phone_number=phone_number,
                    defaults={
                        'firebase_uid': f'aws_sms_{phone_number}',  # AWS SMS用の一意な値
                        'nickname': f'ユーザー{random.randint(1000, 9999)}'
                    }
                )
                
                # 新規ユーザーの場合、30クレジットを付与
                if created:
                    success, message = UnifiedCreditService.add_credits(
                        user_id=str(phone_user.id),
                        amount=30,
                        description='新規登録ボーナス（電話番号認証）',
                        transaction_type='bonus'
                    )
                    logger.info(f"新規ユーザー {phone_user.id} に30クレジット付与: {message}")
                
                # 現在のクレジット残高を取得
                current_credits = UnifiedCreditService.get_user_credits(str(phone_user.id))
                
                # セッション削除
                session.delete()
                
                # 認証トークン生成（既存システムと互換性のため）
                auth_token = str(uuid.uuid4())
                
                return JsonResponse({
                    'success': True,
                    'user_id': str(phone_user.id),
                    'phone_number': phone_user.phone_number,
                    'nickname': phone_user.nickname,
                    'credits': current_credits,
                    'auth_token': auth_token,
                    'is_new_user': created
                })
                
        except json.JSONDecodeError:
            return JsonResponse({'error': '不正なJSONデータです'}, status=400)
        except Exception as e:
            logger.error(f"SMS認証検証エラー: {str(e)}")
            return JsonResponse({'error': 'サーバーエラーが発生しました'}, status=500)


class AWSSMSUserInfoView(View):
    """AWS SNS認証ユーザー情報更新API"""
    
    @method_decorator(csrf_exempt)
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)
    
    def post(self, request):
        """ユーザー情報更新（ニックネーム変更等）"""
        try:
            data = json.loads(request.body)
            user_id = data.get('user_id')
            nickname = data.get('nickname')
            
            if not all([user_id, nickname]):
                return JsonResponse({'error': '必要な情報が不足しています'}, status=400)
            
            try:
                phone_user = PhoneUser.objects.get(id=user_id)
                phone_user.nickname = nickname
                
                # firebase_uidが未設定の場合は設定
                if not phone_user.firebase_uid or phone_user.firebase_uid == '':
                    phone_user.firebase_uid = f'aws_sms_{phone_user.phone_number}'
                
                phone_user.save()
                
                # 現在のクレジット残高を取得
                current_credits = UnifiedCreditService.get_user_credits(str(phone_user.id))
                
                return JsonResponse({
                    'success': True,
                    'user_id': str(phone_user.id),
                    'nickname': phone_user.nickname,
                    'credits': current_credits
                })
                
            except PhoneUser.DoesNotExist:
                return JsonResponse({'error': 'ユーザーが見つかりません'}, status=404)
                
        except json.JSONDecodeError:
            return JsonResponse({'error': '不正なJSONデータです'}, status=400)
        except Exception as e:
            logger.error(f"ユーザー情報更新エラー: {str(e)}")
            return JsonResponse({'error': 'サーバーエラーが発生しました'}, status=500)