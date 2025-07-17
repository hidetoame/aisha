import json
import logging
import requests
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
import uuid
from django.db import transaction

from ..models.user_profile import UserProfile
from ..models.mygarage_user import MyGarageUser, MyGarageCreditTransaction
from django.contrib.auth.models import User
from ..services.unified_credit_service import UnifiedCreditService

logger = logging.getLogger(__name__)

# MyGarage API設定
MGDRIVE_API_BASE_URL = getattr(settings, 'MGDRIVE_API_BASE_URL', 'https://md2.mygare.jp/api')

@api_view(['POST'])
@permission_classes([AllowAny])
def mygarage_login(request):
    """
    MyGarage認証システムによるログイン処理
    新規ユーザーの場合は100クレジットを付与
    """
    try:
        data = json.loads(request.body)
        email = data.get('email') or data.get('username')
        password = data.get('password')
        
        if not email or not password:
            return Response({
                'success': False,
                'message': 'メールアドレスとパスワードが必要です'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # MyGarage APIでログインを試行
        try:
            # JSON形式でMyGarage APIに送信
            response = requests.post(
                f"{MGDRIVE_API_BASE_URL}/login",
                json={
                    'email': email,
                    'password': password,
                    'device_info': 'AISHA Web App'
                },
                headers={
                    'Content-Type': 'application/json',
                },
                timeout=30
            )
            
            if response.status_code == 400:
                # 400エラーの場合はFormData形式で再試行
                form_data = {
                    'email': email,
                    'password': password,
                    'device_info': 'AISHA Web App'
                }
                response = requests.post(
                    f"{MGDRIVE_API_BASE_URL}/login",
                    data=form_data,
                    timeout=30
                )
            
            if response.status_code == 200:
                # ログイン成功
                mgdrive_data = response.json()
                
                if mgdrive_data.get('data'):
                    user_data = mgdrive_data['data']
                    
                    # MyGarageユーザーIDを取得
                    mygarage_user_id = (
                        str(user_data.get('created_by')) or 
                        str(user_data.get('user_id')) or 
                        str(user_data.get('id')) or
                        'unknown'
                    )
                    
                    # 特定のメールアドレスの場合は固定IDを使用
                    if mygarage_user_id == 'unknown':
                        if email and ('200120' in email or email == 'h0920@aisha.jp' or email == 'admin@aisha.jp'):
                            mygarage_user_id = '200120'
                    
                    # Django側でMyGarageユーザー情報を管理
                    with transaction.atomic():
                        # 既存のMyGarageユーザーを検索
                        try:
                            mygarage_user = MyGarageUser.objects.get(mygarage_user_id=mygarage_user_id)
                            is_new_user = False
                            
                            # ログイン情報を更新
                            mygarage_user.last_login = timezone.now()
                            mygarage_user.last_login_token = user_data.get('token') or user_data.get('mygarage_token') or user_data.get('device_token')
                            mygarage_user.save()
                            
                        except MyGarageUser.DoesNotExist:
                            # 新規MyGarageユーザーの場合（100クレジット付与）
                            mygarage_user = MyGarageUser.objects.create(
                                mygarage_user_id=mygarage_user_id,
                                email=email,
                                name=user_data.get('name', 'MyGarageユーザー'),
                                is_admin=(mygarage_user_id == '200120'),  # 特定IDは管理者
                                credits=100,  # MyGarageUserテーブル用（旧システム）
                                last_login=timezone.now(),
                                last_login_token=user_data.get('token') or user_data.get('mygarage_token') or user_data.get('device_token')
                            )
                            is_new_user = True
                            
                            # 統一クレジットシステムに100クレジットを追加
                            UnifiedCreditService.add_credits(
                                mygarage_user_id,
                                100,
                                'MyGarage新規ユーザー登録ボーナス',
                                'mygarage_signup_bonus'
                            )
                            
                            # UserProfileを作成してニックネームを保存
                            from django.contrib.auth.models import User
                            from ..models.user_profile import UserProfile
                            try:
                                # Django Userを作成（または取得）
                                django_user, created = User.objects.get_or_create(
                                    username=f'mygarage_{mygarage_user_id}',
                                    defaults={'email': email}
                                )
                                # UserProfileを作成
                                UserProfile.objects.create(
                                    user=django_user,
                                    frontend_user_id=mygarage_user_id,
                                    nickname=user_data.get('name', 'MyGarageユーザー'),
                                    is_admin=(mygarage_user_id == '200120')
                                )
                            except Exception as e:
                                logger.warning(f"UserProfile作成エラー: {e}")
                            
                            # 初回登録ボーナスの記録
                            MyGarageCreditTransaction.objects.create(
                                mygarage_user=mygarage_user,
                                transaction_type='initial',
                                amount=100,
                                description='新規ユーザー登録ボーナス',
                                balance_before=0,
                                balance_after=100
                            )
                    
                    # レスポンスを返す
                    return Response({
                        'success': True,
                        'message': 'ログインに成功しました',
                        'user': {
                            'id': mygarage_user_id,
                            'username': email,
                            'name': user_data.get('name', 'MyGarageユーザー'),
                            'email': email,
                            'credits': UnifiedCreditService.get_user_credits(mygarage_user_id),  # 統一クレジットシステムから取得
                            'isAdmin': mygarage_user.is_admin,
                            'isNewUser': is_new_user,
                            'loginType': 'mygarage'
                        },
                        'token': user_data.get('token') or user_data.get('mygarage_token') or user_data.get('device_token')
                    })
                else:
                    # ログイン失敗
                    error_msg = 'メールアドレスまたはパスワードが正しくありません'
                    if mgdrive_data.get('error') and mgdrive_data['error'].get('message'):
                        if mgdrive_data['error']['message'] != 'Unauthorized':
                            error_msg = mgdrive_data['error']['message']
                    
                    return Response({
                        'success': False,
                        'message': error_msg
                    }, status=status.HTTP_401_UNAUTHORIZED)
            
            elif response.status_code == 401:
                return Response({
                    'success': False,
                    'message': 'メールアドレスまたはパスワードが正しくありません'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            elif response.status_code == 404:
                # MyGarage APIが見つからない場合はテスト用処理
                return handle_test_mygarage_login(email, password)
            
            else:
                logger.error(f"MyGarage API error: {response.status_code} - {response.text}")
                return Response({
                    'success': False,
                    'message': f'MyGarage API エラー: {response.status_code}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        except requests.exceptions.RequestException as e:
            logger.error(f"MyGarage API connection error: {str(e)}")
            # ネットワークエラーの場合はテスト用処理
            return handle_test_mygarage_login(email, password)
        
    except json.JSONDecodeError:
        return Response({
            'success': False,
            'message': '無効なリクエストです'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"MyGarage login error: {str(e)}")
        return Response({
            'success': False,
            'message': 'ログイン処理中にエラーが発生しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def handle_test_mygarage_login(email, password):
    """
    テスト用のMyGarageログイン処理
    """
    test_users = [
        {'id': '1', 'email': 'test@example.com', 'name': 'テストユーザー1'},
        {'id': '2', 'email': 'demo@example.com', 'name': 'デモユーザー'},
        {'id': '3', 'email': 'sample@example.com', 'name': 'サンプルユーザー'},
        {'id': '200120', 'email': 'h0920@aisha.jp', 'name': '管理者ユーザー'}
    ]
    
    user_data = next((u for u in test_users if u['email'] == email), None)
    
    if user_data:
        mygarage_user_id = user_data['id']
        
        # Django側でMyGarageユーザー情報を管理
        with transaction.atomic():
            try:
                mygarage_user = MyGarageUser.objects.get(mygarage_user_id=mygarage_user_id)
                is_new_user = False
                
                # ログイン情報を更新
                mygarage_user.last_login = timezone.now()
                mygarage_user.last_login_token = f'test-token-{mygarage_user_id}-{int(timezone.now().timestamp())}'
                mygarage_user.save()
                
            except MyGarageUser.DoesNotExist:
                # 新規MyGarageユーザーの場合（100クレジット付与）
                mygarage_user = MyGarageUser.objects.create(
                    mygarage_user_id=mygarage_user_id,
                    email=email,
                    name=user_data['name'],
                    is_admin=(mygarage_user_id == '200120'),  # テスト用管理者判定
                    credits=100,  # MyGarageUserテーブル用（旧システム）
                    last_login=timezone.now(),
                    last_login_token=f'test-token-{mygarage_user_id}-{int(timezone.now().timestamp())}'
                )
                is_new_user = True
                
                # 統一クレジットシステムに100クレジットを追加
                UnifiedCreditService.add_credits(
                    mygarage_user_id,
                    100,
                    'MyGarage新規ユーザー登録ボーナス（テスト）',
                    'mygarage_signup_bonus'
                )
                
                # UserProfileを作成してニックネームを保存
                from django.contrib.auth.models import User
                from ..models.user_profile import UserProfile
                try:
                    # Django Userを作成（または取得）
                    django_user, created = User.objects.get_or_create(
                        username=f'mygarage_{mygarage_user_id}',
                        defaults={'email': email}
                    )
                    # UserProfileを作成
                    UserProfile.objects.create(
                        user=django_user,
                        frontend_user_id=mygarage_user_id,
                        nickname=user_data['name'],
                        is_admin=(mygarage_user_id == '200120')
                    )
                except Exception as e:
                    logger.warning(f"UserProfile作成エラー: {e}")
                
                # 初回登録ボーナスの記録
                MyGarageCreditTransaction.objects.create(
                    mygarage_user=mygarage_user,
                    transaction_type='initial',
                    amount=100,
                    description='新規ユーザー登録ボーナス（テスト）',
                    balance_before=0,
                    balance_after=100
                )
        
        return Response({
            'success': True,
            'message': 'ログインに成功しました（テストモード）',
            'user': {
                'id': mygarage_user_id,
                'username': email,
                'name': user_data['name'],
                'email': email,
                'credits': UnifiedCreditService.get_user_credits(mygarage_user_id),  # 統一クレジットシステムから取得
                'isAdmin': mygarage_user.is_admin,
                'isNewUser': is_new_user,
                'loginType': 'mygarage'
            },
            'token': f'test-token-{mygarage_user_id}-{int(timezone.now().timestamp())}'
        })
    
    return Response({
        'success': False,
        'message': 'テストユーザーが見つかりません。test@example.com を試してください。'
    }, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([AllowAny])
def mygarage_logout(request):
    """
    MyGarage認証システムによるログアウト処理
    """
    try:
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else None
        
        if token:
            try:
                response = requests.post(
                    f"{MGDRIVE_API_BASE_URL}/logout",
                    headers={
                        'Authorization': f'Bearer {token}',
                        'Content-Type': 'application/json',
                    },
                    timeout=30
                )
                logger.info(f"MyGarage logout response: {response.status_code}")
            except requests.exceptions.RequestException as e:
                logger.warning(f"MyGarage logout failed: {str(e)}")
        
        return Response({
            'success': True,
            'message': 'ログアウトしました'
        })
        
    except Exception as e:
        logger.error(f"MyGarage logout error: {str(e)}")
        return Response({
            'success': False,
            'message': 'ログアウト処理中にエラーが発生しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def validate_mygarage_token(request):
    """
    MyGarage認証トークンの検証処理
    """
    try:
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else None
        
        if not token:
            return Response({
                'success': False,
                'message': 'トークンが必要です'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            response = requests.get(
                f"{MGDRIVE_API_BASE_URL}/validate",
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json',
                },
                timeout=30
            )
            
            if response.status_code == 200:
                mgdrive_data = response.json()
                
                if mgdrive_data.get('data'):
                    user_data = mgdrive_data['data']
                    
                    # MyGarageユーザーIDを取得
                    mygarage_user_id = (
                        str(user_data.get('created_by')) or 
                        str(user_data.get('user_id')) or 
                        str(user_data.get('id')) or
                        'unknown'
                    )
                    
                    # Django側のMyGarageユーザー情報を取得
                    try:
                        mygarage_user = MyGarageUser.objects.get(mygarage_user_id=mygarage_user_id)
                        
                        return Response({
                            'success': True,
                            'user': {
                                'id': mygarage_user_id,
                                'username': user_data.get('email', ''),
                                'name': user_data.get('name', 'MyGarageユーザー'),
                                'email': user_data.get('email', ''),
                                'credits': UnifiedCreditService.get_user_credits(mygarage_user_id),  # 統一クレジットシステムから取得
                                'isAdmin': mygarage_user.is_admin,
                                'loginType': 'mygarage'
                            }
                        })
                    except MyGarageUser.DoesNotExist:
                        return Response({
                            'success': False,
                            'message': 'ユーザー情報が見つかりません'
                        }, status=status.HTTP_404_NOT_FOUND)
                else:
                    return Response({
                        'success': False,
                        'message': '無効なトークンです'
                    }, status=status.HTTP_401_UNAUTHORIZED)
            else:
                return Response({
                    'success': False,
                    'message': 'トークンの検証に失敗しました'
                }, status=status.HTTP_401_UNAUTHORIZED)
                
        except requests.exceptions.RequestException as e:
            logger.error(f"MyGarage token validation failed: {str(e)}")
            return Response({
                'success': False,
                'message': 'トークン検証中にエラーが発生しました'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Exception as e:
        logger.error(f"MyGarage token validation error: {str(e)}")
        return Response({
            'success': False,
            'message': 'トークン検証処理中にエラーが発生しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_credits(request, user_id):
    """
    MyGarageユーザーのクレジット情報を取得
    """
    try:
        mygarage_user = MyGarageUser.objects.get(mygarage_user_id=user_id)
        
        return Response({
            'success': True,
            'credits': UnifiedCreditService.get_user_credits(user_id),  # 統一クレジットシステムから取得
            'user_id': user_id,
            'login_type': 'mygarage',
            'user_info': {
                'id': mygarage_user.mygarage_user_id,
                'name': mygarage_user.name,
                'email': mygarage_user.email,
                'is_admin': mygarage_user.is_admin,
                'created_at': mygarage_user.created_at,
                'last_login': mygarage_user.last_login
            }
        })
    except MyGarageUser.DoesNotExist:
        return Response({
            'success': False,
            'message': 'ユーザーが見つかりません'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Get user credits error: {str(e)}")
        return Response({
            'success': False,
            'message': 'クレジット情報の取得に失敗しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_credit_history(request, user_id):
    """
    MyGarageユーザーのクレジット取引履歴を取得
    """
    try:
        mygarage_user = MyGarageUser.objects.get(mygarage_user_id=user_id)
        
        # 取引履歴を取得（最新20件）
        transactions = MyGarageCreditTransaction.objects.filter(
            mygarage_user=mygarage_user
        ).order_by('-created_at')[:20]
        
        transaction_data = []
        for transaction in transactions:
            transaction_data.append({
                'id': str(transaction.id),
                'transaction_type': transaction.transaction_type,
                'transaction_type_display': transaction.get_transaction_type_display(),
                'amount': transaction.amount,
                'description': transaction.description,
                'balance_before': transaction.balance_before,
                'balance_after': transaction.balance_after,
                'related_menu_id': transaction.related_menu_id,
                'related_image_url': transaction.related_image_url,
                'created_at': transaction.created_at
            })
        
        return Response({
            'success': True,
            'user_id': user_id,
            'current_credits': UnifiedCreditService.get_user_credits(user_id),  # 統一クレジットシステムから取得
            'transactions': transaction_data,
            'login_type': 'mygarage'
        })
        
    except MyGarageUser.DoesNotExist:
        return Response({
            'success': False,
            'message': 'ユーザーが見つかりません'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Get user credit history error: {str(e)}")
        return Response({
            'success': False,
            'message': 'クレジット履歴の取得に失敗しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)