from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import json
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials
from ..models.phone_user import PhoneUser
import logging
import os

logger = logging.getLogger(__name__)

# Firebase Admin SDKの初期化（一度だけ実行）
def initialize_firebase():
    try:
        if not firebase_admin._apps:
            # Firebase Admin SDKの設定
            # 環境変数からサービスアカウントキーのパスを取得
            cred_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY_PATH')
            
            if cred_path and os.path.exists(cred_path):
                logger.info(f"サービスアカウントキーファイルを使用: {cred_path}")
                # サービスアカウントキーファイルを使用
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            else:
                logger.info("サービスアカウントキーファイルが見つからないため、デフォルトでgcs-credentials.jsonを使用します")
                # ローカルのgcs-credentials.jsonを使用
                try:
                    cred = credentials.Certificate('/app/gcs-credentials.json')
                    firebase_admin.initialize_app(cred)
                    logger.info("gcs-credentials.jsonでFirebaseを初期化しました")
                except Exception as local_e:
                    logger.error(f"gcs-credentials.jsonでの初期化に失敗: {str(local_e)}")
                    # フォールバックとしてデフォルト認証を試す
                    try:
                        firebase_admin.initialize_app()
                        logger.info("デフォルト認証でFirebaseを初期化しました")
                    except Exception as default_e:
                        logger.error(f"デフォルト認証での初期化に失敗: {str(default_e)}")
                        raise
                    
            logger.info("Firebase Admin SDK initialized successfully")
    except Exception as e:
        logger.error(f"Firebase Admin SDK initialization failed: {str(e)}")

# Firebase Admin SDKを初期化
initialize_firebase()

def verify_firebase_token(id_token):
    """
    Firebase IDトークンを検証
    """
    try:
        decoded_token = firebase_auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        logger.error(f"Firebase token verification failed: {str(e)}")
        return None

@api_view(['POST'])
@permission_classes([AllowAny])
def check_user_exists(request):
    """
    Firebase認証されたユーザーがアプリケーションに登録済みかチェック
    """
    try:
        # Authorization headerからトークンを取得
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return Response({
                'success': False,
                'message': 'Authorizationヘッダーが必要です'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        id_token = auth_header.replace('Bearer ', '')
        
        # Firebase IDトークンを検証
        decoded_token = verify_firebase_token(id_token)
        if not decoded_token:
            return Response({
                'success': False,
                'message': '無効なFirebaseトークンです'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        data = json.loads(request.body)
        firebase_uid = data.get('firebaseUid')
        phone_number = data.get('phoneNumber')
        
        if not firebase_uid or firebase_uid != decoded_token['uid']:
            return Response({
                'success': False,
                'message': 'トークンとUIDが一致しません'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # データベースでユーザーを検索
        try:
            phone_user = PhoneUser.objects.get(firebase_uid=firebase_uid)
            return Response({
                'success': True,
                'exists': True,
                'user': {
                    'id': str(phone_user.id),
                    'nickname': phone_user.nickname,
                    'phoneNumber': phone_user.phone_number,
                    'isAdmin': phone_user.is_admin
                }
            })
        except PhoneUser.DoesNotExist:
            return Response({
                'success': True,
                'exists': False
            })
            
    except json.JSONDecodeError:
        return Response({
            'success': False,
            'message': '無効なリクエストです'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"ユーザー存在確認エラー: {str(e)}")
        return Response({
            'success': False,
            'message': 'ユーザー確認に失敗しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def get_or_create_user_info(request):
    """
    Firebase認証されたユーザーの情報を取得または作成
    """
    try:
        # Authorization headerからトークンを取得
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return Response({
                'success': False,
                'message': 'Authorizationヘッダーが必要です'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        id_token = auth_header.replace('Bearer ', '')
        
        # Firebase IDトークンを検証
        decoded_token = verify_firebase_token(id_token)
        if not decoded_token:
            return Response({
                'success': False,
                'message': '無効なFirebaseトークンです'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        data = json.loads(request.body)
        firebase_uid = data.get('firebaseUid')
        phone_number = data.get('phoneNumber')
        nickname = data.get('nickname')
        
        if not firebase_uid or firebase_uid != decoded_token['uid']:
            return Response({
                'success': False,
                'message': 'トークンとUIDが一致しません'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 既存ユーザーを検索
        try:
            phone_user = PhoneUser.objects.get(firebase_uid=firebase_uid)
            # 既存ユーザーの場合
            return Response({
                'success': True,
                'id': str(phone_user.id),
                'nickname': phone_user.nickname,
                'phoneNumber': phone_user.phone_number,
                'isAdmin': phone_user.is_admin,
                'isNewUser': False
            })
        except PhoneUser.DoesNotExist:
            # 新規ユーザーの場合
            if not nickname:
                return Response({
                    'success': False,
                    'message': 'ニックネームが必要です'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # ニックネームのバリデーション
            nickname = nickname.strip()
            if not nickname or len(nickname) > 20:
                return Response({
                    'success': False,
                    'message': 'ニックネームは1文字以上20文字以内で入力してください'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 電話番号の正規化（+81形式から日本形式へ）
            if phone_number and phone_number.startswith('+81'):
                phone_number = '0' + phone_number[3:]
            
            # 新規ユーザーを作成
            phone_user = PhoneUser.objects.create(
                firebase_uid=firebase_uid,
                phone_number=phone_number or '',
                nickname=nickname,
                is_admin=False,
                credits=100
            )
            
            return Response({
                'success': True,
                'id': str(phone_user.id),
                'nickname': phone_user.nickname,
                'phoneNumber': phone_user.phone_number,
                'isAdmin': phone_user.is_admin,
                'isNewUser': True
            })
            
    except json.JSONDecodeError:
        return Response({
            'success': False,
            'message': '無効なリクエストです'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"ユーザー情報取得/作成エラー: {str(e)}")
        return Response({
            'success': False,
            'message': 'ユーザー情報の処理に失敗しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def validate_firebase_user(request):
    """
    現在のFirebaseトークンを検証してユーザー情報を返す
    """
    try:
        # Authorization headerからトークンを取得
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return Response({
                'success': False,
                'message': 'Authorizationヘッダーが必要です'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        id_token = auth_header.replace('Bearer ', '')
        
        # Firebase IDトークンを検証
        decoded_token = verify_firebase_token(id_token)
        if not decoded_token:
            return Response({
                'success': False,
                'message': '無効なFirebaseトークンです'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        firebase_uid = decoded_token['uid']
        
        # データベースでユーザーを検索
        try:
            phone_user = PhoneUser.objects.get(firebase_uid=firebase_uid)
            return Response({
                'success': True,
                'user': {
                    'id': str(phone_user.id),
                    'nickname': phone_user.nickname,
                    'phoneNumber': phone_user.phone_number,
                    'isAdmin': phone_user.is_admin,
                    'credits': phone_user.credits,
                    'loginType': 'phone'
                }
            })
        except PhoneUser.DoesNotExist:
            return Response({
                'success': False,
                'message': 'ユーザーが見つかりません'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        logger.error(f"Firebase トークン検証エラー: {str(e)}")
        return Response({
            'success': False,
            'message': 'トークン検証に失敗しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)