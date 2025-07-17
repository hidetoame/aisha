from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from ..services.unified_credit_service import UnifiedCreditService
from ..models.phone_user import PhoneUser
import logging
import json

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny])
def add_credits_to_user(request):
    """
    管理者用：ユーザーにクレジットを追加
    """
    try:
        data = json.loads(request.body)
        user_identifier = data.get('userIdentifier')  # firebase_uid または nickname
        amount = data.get('amount', 100)
        description = data.get('description', '管理者による追加')
        
        if not user_identifier:
            return Response({
                'success': False,
                'message': 'ユーザー識別子が必要です'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # ユーザーを検索（PhoneUserとMyGarageUser両方）
        phone_user = None
        mygarage_user = None
        firebase_uid = None
        
        # まずPhoneUserから検索
        try:
            # Firebase UIDで検索
            phone_user = PhoneUser.objects.get(firebase_uid=user_identifier)
            firebase_uid = user_identifier
        except PhoneUser.DoesNotExist:
            try:
                # ニックネームで部分一致検索
                phone_user = PhoneUser.objects.filter(nickname__icontains=user_identifier).first()
                if phone_user:
                    firebase_uid = phone_user.firebase_uid
            except PhoneUser.DoesNotExist:
                pass
        
        # PhoneUserで見つからない場合はuser_creditsから検索
        if not phone_user:
            try:
                from ..models.credit_charge import UserCredit
                from ..models.user_profile import UserProfile
                # user_creditsテーブルからuser_idで部分一致検索
                user_credit = UserCredit.objects.filter(user_id__icontains=user_identifier).first()
                if user_credit:
                    firebase_uid = user_credit.user_id
                    # MyGarageUserの代わりにuser_creditを使用
                    mygarage_user = user_credit
            except Exception:
                pass
        
        # どちらのテーブルからも見つからない場合
        if not phone_user and not mygarage_user:
            return Response({
                'success': False,
                'message': f'対象ユーザーがみつかりません: {user_identifier}（電話番号認証・user_creditsテーブルの両方で検索しました）'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if not firebase_uid:
            return Response({
                'success': False,
                'message': 'Firebase UIDが設定されていません'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 統一クレジットシステムにクレジットを追加
        success, message = UnifiedCreditService.add_credits(
            firebase_uid,
            amount,
            description,
            'admin_bonus'
        )
        
        if success:
            # 最新のクレジット残高を取得
            credit_balance = UnifiedCreditService.get_user_credits(firebase_uid)
            
            # ログとレスポンスを作成
            user_name = phone_user.nickname if phone_user else mygarage_user.user_id
            logger.info(f"管理者によるクレジット追加: {user_name} ({firebase_uid}) に {amount} クレジット追加")
            
            # レスポンスを作成（どちらのテーブルかによって異なる）
            if phone_user:
                user_data = {
                    'id': str(phone_user.id),
                    'nickname': phone_user.nickname,
                    'firebase_uid': firebase_uid,
                    'credits': credit_balance,
                    'user_type': '電話番号認証'
                }
            else:  # mygarage_user (user_credit)
                # user_creditsテーブルの場合、user_idをより分かりやすく表示
                display_name = mygarage_user.user_id
                user_type = 'MyGarageユーザー'
                
                # MyGarageユーザーの場合はUserProfileからニックネームを取得
                if mygarage_user.user_id.isdigit():
                    try:
                        user_profile = UserProfile.objects.get(frontend_user_id=mygarage_user.user_id)
                        if user_profile.nickname:
                            display_name = user_profile.nickname
                        else:
                            display_name = f"ユーザー{mygarage_user.user_id}"
                    except UserProfile.DoesNotExist:
                        display_name = f"ユーザー{mygarage_user.user_id}"
                elif len(mygarage_user.user_id) > 20:
                    display_name = f"{mygarage_user.user_id[:8]}...{mygarage_user.user_id[-8:]}"
                
                user_data = {
                    'id': str(mygarage_user.id),
                    'nickname': display_name,
                    'firebase_uid': firebase_uid,
                    'credits': credit_balance,
                    'user_type': user_type
                }
            
            return Response({
                'success': True,
                'message': f'{user_name} に {amount} クレジットを追加しました',
                'user': user_data
            })
        else:
            return Response({
                'success': False,
                'message': f'クレジット追加に失敗しました: {message}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except json.JSONDecodeError:
        return Response({
            'success': False,
            'message': '無効なJSONです'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"クレジット追加エラー: {str(e)}")
        return Response({
            'success': False,
            'message': f'エラーが発生しました: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_credits(request):
    """
    管理者用：ユーザーのクレジット残高を確認
    """
    try:
        user_identifier = request.GET.get('user')
        
        if not user_identifier:
            return Response({
                'success': False,
                'message': 'ユーザー識別子が必要です'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # ユーザーを検索（PhoneUserとMyGarageUser両方）
        found_users = []
        
        # まずPhoneUserから検索
        try:
            # Firebase UIDで完全一致検索
            phone_user = PhoneUser.objects.get(firebase_uid=user_identifier)
            unified_credits = UnifiedCreditService.get_user_credits(phone_user.firebase_uid)
            found_users.append({
                'id': str(phone_user.id),
                'nickname': phone_user.nickname,
                'firebase_uid': phone_user.firebase_uid,
                'phone_number': phone_user.phone_number,
                'unified_credits': unified_credits,
                'user_type': '電話番号認証'
            })
        except PhoneUser.DoesNotExist:
            pass
        
        # ニックネームで部分一致検索（PhoneUser）
        try:
            phone_users = PhoneUser.objects.filter(nickname__icontains=user_identifier)
            for phone_user in phone_users:
                # 既に追加済みの場合はスキップ
                if any(user['firebase_uid'] == phone_user.firebase_uid for user in found_users):
                    continue
                unified_credits = UnifiedCreditService.get_user_credits(phone_user.firebase_uid)
                found_users.append({
                    'id': str(phone_user.id),
                    'nickname': phone_user.nickname,
                    'firebase_uid': phone_user.firebase_uid,
                    'phone_number': phone_user.phone_number,
                    'unified_credits': unified_credits,
                    'user_type': '電話番号認証'
                })
        except Exception:
            pass
        
        # user_creditsテーブルからuser_idで部分一致検索
        try:
            from ..models.credit_charge import UserCredit
            from ..models.user_profile import UserProfile
            user_credits = UserCredit.objects.filter(user_id__icontains=user_identifier)
            for user_credit in user_credits:
                # 既に追加済みの場合はスキップ（PhoneUserのFirebase UIDと重複チェック）
                if any(user['firebase_uid'] == user_credit.user_id for user in found_users):
                    continue
                
                # user_creditsテーブルのuser_idがPhoneUserのFirebase UIDと一致する場合はスキップ
                # (統一クレジットは既にPhoneUserの検索結果に含まれているため)
                try:
                    PhoneUser.objects.get(firebase_uid=user_credit.user_id)
                    continue  # PhoneUserが存在する場合はスキップ
                except PhoneUser.DoesNotExist:
                    pass  # PhoneUserが存在しない場合は表示する
                
                unified_credits = UnifiedCreditService.get_user_credits(user_credit.user_id)
                
                # user_idを見やすい形式に変換
                display_name = user_credit.user_id
                user_type = 'UserCreditユーザー'
                
                # MyGarageユーザーの場合はUserProfileからニックネームを取得
                if user_credit.user_id.isdigit():
                    try:
                        user_profile = UserProfile.objects.get(frontend_user_id=user_credit.user_id)
                        if user_profile.nickname:
                            display_name = user_profile.nickname
                        else:
                            display_name = f"ユーザー{user_credit.user_id}"
                        user_type = 'MyGarageユーザー'
                    except UserProfile.DoesNotExist:
                        display_name = f"ユーザー{user_credit.user_id}"
                        user_type = '数値IDユーザー'
                # 特定のパターンを判定
                elif user_credit.user_id == 'demo_user':
                    display_name = 'デモユーザー'
                    user_type = 'デモユーザー'
                elif len(user_credit.user_id) > 20:
                    display_name = f"{user_credit.user_id[:8]}...{user_credit.user_id[-8:]}"
                    user_type = 'UUIDユーザー'
                
                found_users.append({
                    'id': str(user_credit.id),
                    'nickname': display_name,
                    'firebase_uid': user_credit.user_id,
                    'phone_number': 'N/A',
                    'unified_credits': unified_credits,
                    'user_type': user_type
                })
        except Exception:
            pass
        
        # どちらのテーブルからも見つからない場合
        if not found_users:
            return Response({
                'success': False,
                'message': f'対象ユーザーがみつかりません: {user_identifier}（電話番号認証・user_creditsテーブルの両方で検索しました）'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 複数のユーザーが見つかった場合はすべてを返す
        if len(found_users) == 1:
            return Response({
                'success': True,
                'user': found_users[0]
            })
        else:
            return Response({
                'success': True,
                'users': found_users,
                'count': len(found_users),
                'message': f'{len(found_users)}人のユーザーが見つかりました'
            })
        
    except Exception as e:
        logger.error(f"クレジット確認エラー: {str(e)}")
        return Response({
            'success': False,
            'message': f'エラーが発生しました: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
@permission_classes([AllowAny])
def delete_user(request):
    """
    管理者用：ユーザーを削除（統一クレジットシステムとPhoneUserから）
    """
    try:
        user_identifier = request.GET.get('user')
        
        if not user_identifier:
            return Response({
                'success': False,
                'message': 'ユーザー識別子が必要です'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        deleted_info = []
        
        # PhoneUserから削除
        try:
            # まずFirebase UIDで検索
            phone_user = PhoneUser.objects.get(firebase_uid=user_identifier)
            firebase_uid = user_identifier
        except PhoneUser.DoesNotExist:
            try:
                # 次にニックネームで検索
                phone_user = PhoneUser.objects.get(nickname=user_identifier)
                firebase_uid = phone_user.firebase_uid
            except PhoneUser.DoesNotExist:
                phone_user = None
                firebase_uid = None
        
        if phone_user:
            phone_user_info = f"PhoneUser: {phone_user.nickname} (UID: {firebase_uid})"
            phone_user.delete()
            deleted_info.append(phone_user_info)
            logger.info(f"PhoneUser削除: {phone_user_info}")
        
        # 統一クレジットシステムから削除
        if firebase_uid:
            from ..models.credit_charge import UserCredit, CreditTransaction
            
            # UserCreditを削除
            try:
                user_credit = UserCredit.objects.get(user_id=firebase_uid)
                user_credit.delete()
                deleted_info.append(f"UserCredit: {firebase_uid}")
                logger.info(f"UserCredit削除: {firebase_uid}")
            except UserCredit.DoesNotExist:
                pass
            
            # CreditTransactionを削除
            transactions_deleted = CreditTransaction.objects.filter(user_id=firebase_uid).delete()
            if transactions_deleted[0] > 0:
                deleted_info.append(f"CreditTransactions: {transactions_deleted[0]}件")
                logger.info(f"CreditTransaction削除: {transactions_deleted[0]}件")
        
        if deleted_info:
            return Response({
                'success': True,
                'message': f'ユーザー削除完了: {user_identifier}',
                'deleted': deleted_info
            })
        else:
            return Response({
                'success': False,
                'message': f'ユーザーが見つかりません: {user_identifier}'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        logger.error(f"ユーザー削除エラー: {str(e)}")
        return Response({
            'success': False,
            'message': f'エラーが発生しました: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)