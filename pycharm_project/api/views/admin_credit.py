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
        
        # ユーザーを検索（PhoneUserとuser_credits両方）
        phone_user = None
        user_credit = None
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
                                    # user_creditを使用
                user_credit = user_credit
            except Exception:
                pass
        
        # どちらのテーブルからも見つからない場合
        if not phone_user and not user_credit:
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
            user_name = phone_user.nickname if phone_user else user_credit.user_id
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
            else:  # user_credit
                # user_creditsテーブルの場合、user_idをより分かりやすく表示
                display_name = user_credit.user_id
                user_type = 'MyGarageユーザー'
                
                # MyGarageユーザーの場合はUserProfileからニックネームを取得
                if user_credit.user_id.isdigit():
                    try:
                        user_profile = UserProfile.objects.get(frontend_user_id=user_credit.user_id)
                        if user_profile.nickname:
                            display_name = user_profile.nickname
                        else:
                            display_name = f"ユーザー{user_credit.user_id}"
                    except UserProfile.DoesNotExist:
                        display_name = f"ユーザー{user_credit.user_id}"
                elif len(user_credit.user_id) > 20:
                    display_name = f"{user_credit.user_id[:8]}...{user_credit.user_id[-8:]}"
                
                user_data = {
                    'id': str(user_credit.id),
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
        
        # ユーザーを検索（PhoneUserとuser_credits両方）
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
            
            # 1. UserProfileのニックネームで部分一致検索
            user_profiles = UserProfile.objects.filter(nickname__icontains=user_identifier)
            for user_profile in user_profiles:
                # 対応するUserCreditを検索
                try:
                    user_credit = UserCredit.objects.get(user_id=user_profile.frontend_user_id)
                    
                    # 既に追加済みの場合はスキップ（PhoneUserのFirebase UIDと重複チェック）
                    if any(user['firebase_uid'] == user_credit.user_id for user in found_users):
                        continue
                    
                    # user_creditsテーブルのuser_idがPhoneUserのFirebase UIDと一致する場合はスキップ
                    try:
                        PhoneUser.objects.get(firebase_uid=user_credit.user_id)
                        continue  # PhoneUserが存在する場合はスキップ
                    except PhoneUser.DoesNotExist:
                        pass  # PhoneUserが存在しない場合は表示する
                    
                    unified_credits = UnifiedCreditService.get_user_credits(user_credit.user_id)
                    
                    found_users.append({
                        'id': str(user_credit.id),
                        'nickname': user_profile.nickname,
                        'firebase_uid': user_credit.user_id,
                        'phone_number': 'N/A',
                        'unified_credits': unified_credits,
                        'user_type': 'MyGarageユーザー'
                    })
                except UserCredit.DoesNotExist:
                    # UserProfileは存在するがUserCreditが存在しない場合
                    pass
            
            # 2. 従来のUserCreditのuser_id直接検索（UserProfileで見つからなかった場合のフォールバック）
            user_credits = UserCredit.objects.filter(user_id__icontains=user_identifier)
            for user_credit in user_credits:
                # 既に追加済みの場合はスキップ（PhoneUserのFirebase UIDと重複チェック）
                if any(user['firebase_uid'] == user_credit.user_id for user in found_users):
                    continue
                
                # user_creditsテーブルのuser_idがPhoneUserのFirebase UIDと一致する場合はスキップ
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

@api_view(['GET'])
@permission_classes([AllowAny])
def get_all_users(request):
    """
    管理者用：全ユーザー一覧を取得（ユーザー数統計付き）
    """
    try:
        from ..models.credit_charge import UserCredit
        from ..models.user_profile import UserProfile
        
        # 統計情報を取得
        total_users = 0
        mygarage_users = 0
        phone_users = 0
        
        # MyGarageユーザー数（UserProfileから）
        mygarage_users = UserProfile.objects.count()
        
        # 電話番号認証ユーザー数（PhoneUserから）
        phone_users = PhoneUser.objects.count()
        
        # 総ユーザー数（重複を除く）
        total_users = mygarage_users + phone_users
        
        # ユーザー詳細一覧を取得
        all_users = []
        
        # MyGarageユーザーを追加
        user_profiles = UserProfile.objects.all()
        for profile in user_profiles:
            try:
                user_credit = UserCredit.objects.get(user_id=profile.frontend_user_id)
                unified_credits = UnifiedCreditService.get_user_credits(user_credit.user_id)
            except UserCredit.DoesNotExist:
                unified_credits = 0
            
            # 生成画像数を取得
            try:
                from ..models.library import Library
                generated_images_count = Library.objects.filter(user_id=profile.frontend_user_id).count()
            except:
                generated_images_count = 0
            
            all_users.append({
                'id': str(profile.id),
                'nickname': profile.nickname,
                'firebase_uid': profile.frontend_user_id,
                'phone_number': 'N/A',
                'unified_credits': unified_credits,
                'user_type': 'MyGarageユーザー',
                'created_at': profile.created_at.isoformat() if hasattr(profile, 'created_at') else None,
                'last_login_at': profile.last_login_at.isoformat() if hasattr(profile, 'last_login_at') and profile.last_login_at else None,
                'generated_images_count': generated_images_count
            })
        
        # 電話番号認証ユーザーを追加
        phone_user_list = PhoneUser.objects.all()
        for phone_user in phone_user_list:
            # 既にMyGarageユーザーとして追加済みの場合はスキップ
            if any(user['firebase_uid'] == phone_user.firebase_uid for user in all_users):
                continue
            
            unified_credits = UnifiedCreditService.get_user_credits(phone_user.firebase_uid)
            
            # 生成画像数を取得
            try:
                from ..models.library import Library
                generated_images_count = Library.objects.filter(user_id=phone_user.firebase_uid).count()
            except:
                generated_images_count = 0
            
            all_users.append({
                'id': str(phone_user.id),
                'nickname': phone_user.nickname,
                'firebase_uid': phone_user.firebase_uid,
                'phone_number': phone_user.phone_number,
                'unified_credits': unified_credits,
                'user_type': '電話番号認証',
                'created_at': phone_user.created_at.isoformat() if hasattr(phone_user, 'created_at') else None,
                'last_login_at': phone_user.last_login_at.isoformat() if hasattr(phone_user, 'last_login_at') and phone_user.last_login_at else None,
                'generated_images_count': generated_images_count
            })
        
        # 作成日時でソート（新しい順）
        all_users.sort(key=lambda x: x['created_at'] or '', reverse=True)
        
        # 検索フィルター
        search_query = request.GET.get('search', '').strip()
        if search_query:
            filtered_users = []
            for user in all_users:
                if (search_query.lower() in user['nickname'].lower() or 
                    search_query.lower() in user['firebase_uid'].lower()):
                    filtered_users.append(user)
            all_users = filtered_users
        
        # 最新20件に制限
        limit = int(request.GET.get('limit', 20))
        all_users = all_users[:limit]
        
        return Response({
            'success': True,
            'statistics': {
                'total_users': total_users,
                'mygarage_users': mygarage_users,
                'phone_users': phone_users
            },
            'users': all_users,
            'count': len(all_users),
            'search_query': search_query,
            'limit': limit
        })
        
    except Exception as e:
        logger.error(f"ユーザー一覧取得エラー: {str(e)}")
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

@api_view(['GET'])
@permission_classes([AllowAny])
def get_generation_history_stats(request):
    """
    全ユーザーの生成履歴統計を取得
    """
    try:
        from api.models.library import Library
        from django.db.models import Count, Q
        
        # 基本統計
        total_generations = Library.objects.count()
        library_registrations = Library.objects.filter(is_saved_to_library=True).count()
        public_images = Library.objects.filter(is_public=True).count()
        goods_creations = Library.objects.aggregate(
            total_goods=Count('id', filter=Q(goods_creation_count__gt=0))
        )['total_goods'] or 0
        
        # カテゴリ別統計（カテゴリIDベースで集計）
        category_stats = {}
        
        # イラスト作成（category.id = 3）
        illustration_count = Library.objects.filter(
            used_form_data__category__id=3
        ).count()
        category_stats['illustration'] = illustration_count
        
        # シーン変更（category.id = 1）
        scene_change_count = Library.objects.filter(
            used_form_data__category__id=1
        ).count()
        category_stats['scene_change'] = scene_change_count
        
        # カスタマイズ（category.id = 2）
        customization_count = Library.objects.filter(
            used_form_data__category__id=2
        ).count()
        category_stats['customization'] = customization_count
        
        return Response({
            'success': True,
            'stats': {
                'total_generations': total_generations,
                'library_registrations': library_registrations,
                'public_images': public_images,
                'goods_creations': goods_creations,
                'category_stats': category_stats
            }
        })
        
    except Exception as e:
        logger.error(f"生成履歴統計取得エラー: {str(e)}")
        return Response({
            'success': False,
            'error': '生成履歴統計の取得に失敗しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_generation_history_list(request):
    """
    全ユーザーの生成履歴一覧を取得（最大50件）
    """
    try:
        from api.models.library import Library
        from api.models.user_profile import UserProfile
        from django.db.models import Q
        
        # クエリパラメータ
        limit = min(int(request.query_params.get('limit', 50)), 50)  # 最大50件
        search = request.query_params.get('search', '')
        category_filter = request.query_params.get('category', '')
        user_filter = request.query_params.get('user', '')
        rating_filter = request.query_params.get('rating', '')
        
        # 基本クエリセット
        queryset = Library.objects.select_related().order_by('-timestamp')
        
        # 検索フィルター
        if search:
            queryset = queryset.filter(
                Q(display_prompt__icontains=search) |
                Q(menu_name__icontains=search) |
                Q(user_id__icontains=search)
            )
        
        # カテゴリフィルター（カテゴリIDベース）
        if category_filter:
            if category_filter == 'illustration':
                # イラスト作成（category.id = 3）
                queryset = queryset.filter(
                    used_form_data__category__id=3
                )
            elif category_filter == 'scene_change':
                # シーン変更（category.id = 1）
                queryset = queryset.filter(
                    used_form_data__category__id=1
                )
            elif category_filter == 'customization':
                # カスタマイズ（category.id = 2）
                queryset = queryset.filter(
                    used_form_data__category__id=2
                )
        
        # ユーザーフィルター
        if user_filter:
            queryset = queryset.filter(user_id__icontains=user_filter)
        
        # 評価フィルター
        if rating_filter:
            queryset = queryset.filter(rating=rating_filter)
        
        # ユーザー情報を取得（件数制限前に実行）
        user_ids = list(queryset.values_list('user_id', flat=True).distinct())
        
        # 件数制限
        queryset = queryset[:limit]
        user_profiles = {
            profile.frontend_user_id: profile.nickname 
            for profile in UserProfile.objects.filter(frontend_user_id__in=user_ids)
        }
        
        # レスポンスデータ構築
        history_list = []
        for item in queryset:
            # カテゴリ判定（カテゴリIDベース）
            category = 'customization'  # デフォルト
            try:
                if item.used_form_data:
                    import json
                    form_data = json.loads(item.used_form_data) if isinstance(item.used_form_data, str) else item.used_form_data
                    if isinstance(form_data, dict) and 'category' in form_data:
                        category_data = form_data['category']
                        if isinstance(category_data, dict):
                            category_id = category_data.get('id')
                            if category_id == 3:
                                category = 'illustration'
                            elif category_id == 1:
                                category = 'scene_change'
                            elif category_id == 2:
                                category = 'customization'
            except:
                pass
            
            history_list.append({
                'id': str(item.id),
                'user_id': item.user_id,
                'user_name': user_profiles.get(item.user_id, 'Unknown User'),
                'image_url': item.image_url,
                'display_prompt': item.display_prompt,
                'menu_name': item.menu_name,
                'category': category,
                'rating': item.rating,
                'is_public': item.is_public,
                'is_saved_to_library': item.is_saved_to_library,
                'goods_creation_count': item.goods_creation_count,
                'created_at': item.created_at.isoformat(),
                'timestamp': item.timestamp.isoformat()
            })
        
        return Response({
            'success': True,
            'history': history_list,
            'total_count': len(history_list)
        })
        
    except Exception as e:
        logger.error(f"生成履歴一覧取得エラー: {str(e)}")
        return Response({
            'success': False,
            'error': '生成履歴一覧の取得に失敗しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)