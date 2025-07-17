import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import secrets  # セキュリティ改善：randomからsecretsに変更
import string
import uuid
from datetime import timedelta
from ..models.phone_user import PhoneUser, PhoneVerificationSession, PhoneLoginToken
from ..services.unified_credit_service import UnifiedCreditService

logger = logging.getLogger(__name__)

def generate_verification_code():
    """6桁の認証番号を生成（セキュア版）"""
    return ''.join(secrets.choice(string.digits) for _ in range(6))

def generate_session_id():
    """セッションIDを生成（セキュア版）"""
    return secrets.token_urlsafe(32)

def generate_token():
    """ログイン用トークンを生成（セキュア版）"""
    return secrets.token_urlsafe(64)

def send_sms(phone_number, verification_code):
    """
    SMS送信機能（実装はテスト用）
    実際の運用では、AWS SNS、Twilio、またはキャリアAPIを使用
    """
    # テスト用の実装（実際には外部サービスを使用）
    logger.info(f"SMS送信（テスト）: {phone_number} -> 認証番号: {verification_code}")
    
    # 実際の実装例:
    # import boto3
    # sns = boto3.client('sns', region_name='ap-northeast-1')
    # message = f"AISHA認証番号: {verification_code}"
    # sns.publish(PhoneNumber=phone_number, Message=message)
    
    return True

@api_view(['POST'])
@permission_classes([AllowAny])
def send_sms_verification(request):
    """SMS認証番号を送信"""
    try:
        data = json.loads(request.body)
        phone_number = data.get('phoneNumber')
        
        if not phone_number:
            return Response({
                'success': False,
                'message': '電話番号が必要です'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 電話番号の基本バリデーション
        if len(phone_number) != 11 or not phone_number.startswith('0'):
            return Response({
                'success': False,
                'message': '正しい電話番号を入力してください'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 認証番号とセッションIDを生成
        verification_code = generate_verification_code()
        session_id = generate_session_id()
        
        # 既存のセッションを削除（同じ電話番号）
        PhoneVerificationSession.objects.filter(
            phone_number=phone_number,
            is_verified=False
        ).delete()
        
        # 新しいセッションを作成
        expires_at = timezone.now() + timedelta(minutes=10)  # 10分後に期限切れ
        verification_session = PhoneVerificationSession.objects.create(
            phone_number=phone_number,
            verification_code=verification_code,
            session_id=session_id,
            expires_at=expires_at
        )
        
        # SMS送信
        if send_sms(phone_number, verification_code):
            return Response({
                'success': True,
                'message': 'SMS認証番号を送信しました',
                'sessionId': session_id
            })
        else:
            return Response({
                'success': False,
                'message': 'SMS送信に失敗しました'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except json.JSONDecodeError:
        return Response({
            'success': False,
            'message': '無効なリクエストです'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"SMS送信エラー: {str(e)}")
        return Response({
            'success': False,
            'message': 'SMS送信に失敗しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_sms_code(request):
    """SMS認証番号を検証"""
    try:
        data = json.loads(request.body)
        phone_number = data.get('phoneNumber')
        verification_code = data.get('verificationCode')
        session_id = data.get('sessionId')
        
        if not all([phone_number, verification_code, session_id]):
            return Response({
                'success': False,
                'message': '必要な情報が不足しています'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # セッションを検索
        try:
            verification_session = PhoneVerificationSession.objects.get(
                phone_number=phone_number,
                session_id=session_id,
                is_verified=False
            )
        except PhoneVerificationSession.DoesNotExist:
            return Response({
                'success': False,
                'message': '無効なセッションです'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 期限切れチェック
        if verification_session.expires_at < timezone.now():
            verification_session.delete()
            return Response({
                'success': False,
                'message': '認証番号の有効期限が切れています'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 認証番号チェック
        if verification_session.verification_code != verification_code:
            return Response({
                'success': False,
                'message': '認証番号が正しくありません'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 認証成功
        verification_session.is_verified = True
        verification_session.save()
        
        # 既存ユーザーかチェック
        try:
            phone_user = PhoneUser.objects.get(phone_number=phone_number)
            is_new_user = False
        except PhoneUser.DoesNotExist:
            phone_user = None
            is_new_user = True
        
        if is_new_user:
            # 新規ユーザーの場合
            return Response({
                'success': True,
                'message': '認証に成功しました',
                'isNewUser': True
            })
        else:
            # 既存ユーザーの場合はトークンを生成してログイン
            token = generate_token()
            expires_at = timezone.now() + timedelta(days=30)  # 30日間有効
            
            # 既存のトークンを削除
            PhoneLoginToken.objects.filter(phone_user=phone_user).delete()
            
            # 新しいトークンを作成
            PhoneLoginToken.objects.create(
                phone_user=phone_user,
                token=token,
                expires_at=expires_at
            )
            
            return Response({
                'success': True,
                'message': 'ログインに成功しました',
                'isNewUser': False,
                'userId': str(phone_user.id),
                'token': token,
                'nickname': phone_user.nickname
            })
            
    except json.JSONDecodeError:
        return Response({
            'success': False,
            'message': '無効なリクエストです'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"SMS認証エラー: {str(e)}")
        return Response({
            'success': False,
            'message': '認証に失敗しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_phone_user(request):
    """電話番号ユーザーを登録"""
    try:
        data = json.loads(request.body)
        phone_number = data.get('phoneNumber')
        nickname = data.get('nickname')
        session_id = data.get('sessionId')
        
        if not all([phone_number, nickname, session_id]):
            return Response({
                'success': False,
                'message': '必要な情報が不足しています'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # ニックネームのバリデーション
        nickname = nickname.strip()
        if not nickname or len(nickname) > 20:
            return Response({
                'success': False,
                'message': 'ニックネームは1文字以上20文字以内で入力してください'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 認証済みセッションを確認
        try:
            verification_session = PhoneVerificationSession.objects.get(
                phone_number=phone_number,
                session_id=session_id,
                is_verified=True
            )
        except PhoneVerificationSession.DoesNotExist:
            return Response({
                'success': False,
                'message': '認証が完了していません'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 既存ユーザーチェック
        if PhoneUser.objects.filter(phone_number=phone_number).exists():
            return Response({
                'success': False,
                'message': 'この電話番号は既に登録されています'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Firebase UIDを生成（統一クレジットシステム用）
        firebase_uid = f"phone_{phone_number}_{str(uuid.uuid4())[:8]}"
        
        # ユーザーを作成
        phone_user = PhoneUser.objects.create(
            firebase_uid=firebase_uid,
            phone_number=phone_number,
            nickname=nickname,
            is_admin=False,
            credits=30  # 電話番号ログインは30クレジット
        )
        
        # 統一クレジットシステムに30クレジットを追加
        UnifiedCreditService.add_credits(
            firebase_uid,
            30,
            '電話番号認証新規ユーザー登録ボーナス',
            'phone_signup_bonus'
        )
        
        # トークンを生成
        token = generate_token()
        expires_at = timezone.now() + timedelta(days=30)
        
        PhoneLoginToken.objects.create(
            phone_user=phone_user,
            token=token,
            expires_at=expires_at
        )
        
        # セッションを削除
        verification_session.delete()
        
        return Response({
            'success': True,
            'message': 'ユーザー登録に成功しました',
            'userId': str(phone_user.id),
            'token': token
        })
        
    except json.JSONDecodeError:
        return Response({
            'success': False,
            'message': '無効なリクエストです'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"ユーザー登録エラー: {str(e)}")
        return Response({
            'success': False,
            'message': 'ユーザー登録に失敗しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def validate_phone_token(request):
    """電話番号ログイン用トークンを検証"""
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not token:
            return Response({
                'success': False,
                'message': 'トークンが必要です'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            login_token = PhoneLoginToken.objects.get(token=token)
        except PhoneLoginToken.DoesNotExist:
            return Response({
                'success': False,
                'message': '無効なトークンです'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # 期限切れチェック
        if login_token.expires_at < timezone.now():
            login_token.delete()
            return Response({
                'success': False,
                'message': 'トークンの有効期限が切れています'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        phone_user = login_token.phone_user
        
        return Response({
            'success': True,
            'user': {
                'id': str(phone_user.id),
                'nickname': phone_user.nickname,
                'phoneNumber': phone_user.phone_number,
                'isAdmin': phone_user.is_admin,
                'credits': UnifiedCreditService.get_user_credits(phone_user.firebase_uid),
                'loginType': 'phone'
            }
        })
        
    except Exception as e:
        logger.error(f"トークン検証エラー: {str(e)}")
        return Response({
            'success': False,
            'message': 'トークン検証に失敗しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)