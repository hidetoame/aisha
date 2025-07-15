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
from ..services.unified_credit_service import UnifiedCreditService
import logging
import os
import datetime

logger = logging.getLogger(__name__)

# Firebase Admin SDKの初期化（一度だけ実行）
def initialize_firebase():
    try:
        # 既に初期化済みの場合はスキップ
        if firebase_admin._apps:
            logger.info("Firebase Admin SDK は既に初期化済みです")
            return
            
        logger.info("🔥 Firebase Admin SDK の初期化を開始します（GCS認証と分離）")
        logger.info(f"🗂️ 現在の作業ディレクトリ: {os.getcwd()}")
        
        # Firebase専用の認証ファイルを使用（GCS認証と完全に分離）
        firebase_cred_paths = [
            os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY_PATH'),  # 環境変数で指定
            '/app/firebase-credentials.json',  # Firebase専用ファイル
            'firebase-credentials.json',  # ローカルのFirebase専用ファイル
            '/app/service-account.json',  # 汎用サービスアカウント
            'service-account.json',  # ローカルの汎用サービスアカウント
        ]
        
        logger.info("📋 Firebase認証ファイル候補の確認:")
        for i, path in enumerate(firebase_cred_paths):
            if path:
                abs_path = os.path.abspath(path) if path else 'None'
                exists = os.path.exists(path) if path else False
                logger.info(f"   {i+1}. {path} -> {abs_path} ({'存在' if exists else '存在しない'})")
            else:
                logger.info(f"   {i+1}. (環境変数未設定)")
        
        firebase_cred = None
        used_path = None
        
        for cred_path in firebase_cred_paths:
            if cred_path and os.path.exists(cred_path):
                try:
                    logger.info(f"🔑 Firebase認証ファイルを試行: {cred_path}")
                    
                    # ファイル内容の基本チェック
                    with open(cred_path, 'r') as f:
                        content = f.read()
                        logger.info(f"📄 ファイルサイズ: {len(content)} bytes")
                        
                        # JSONの基本構造をチェック
                        import json
                        cred_data = json.loads(content)
                        project_id = cred_data.get('project_id', 'unknown')
                        client_email = cred_data.get('client_email', 'unknown')
                        logger.info(f"🆔 プロジェクトID: {project_id}")
                        logger.info(f"📧 クライアントメール: {client_email}")
                    
                    firebase_cred = credentials.Certificate(cred_path)
                    used_path = cred_path
                    logger.info(f"✅ Firebase認証ファイル読み込み成功: {cred_path}")
                    break
                except json.JSONDecodeError as e:
                    logger.error(f"❌ JSON形式エラー: {cred_path} - {str(e)}")
                    continue
                except Exception as cred_error:
                    logger.warning(f"⚠️ Firebase認証ファイル読み込みエラー: {cred_path} - {str(cred_error)}")
                    continue
        
        if firebase_cred:
            logger.info(f"🚀 Firebase Admin SDK を初期化中（認証ファイル: {used_path}）")
            
            # 初期化前の最終チェック
            try:
                app = firebase_admin.initialize_app(firebase_cred)
                logger.info(f"✅ Firebase Admin SDK 初期化成功: app名={app.name}")
                
                # 初期化後のテスト
                try:
                    test_project = firebase_admin.get_app().project_id
                    logger.info(f"🔬 初期化テスト成功: プロジェクトID={test_project}")
                except Exception as test_error:
                    logger.warning(f"⚠️ 初期化後テスト失敗: {str(test_error)}")
                    
            except ValueError as ve:
                if "The default Firebase app already exists" in str(ve):
                    logger.info("✅ Firebase Admin SDK は既に初期化済みでした")
                else:
                    raise ve
        else:
            logger.error("❌ Firebase認証ファイルが見つかりません")
            raise Exception("Firebase認証ファイルが見つかりません")
            
    except Exception as e:
        logger.error(f"❌ Firebase Admin SDK 初期化エラー: {type(e).__name__}: {str(e)}")
        import traceback
        logger.error(f"📚 スタックトレース: {traceback.format_exc()}")
        # Firebaseの初期化に失敗してもサーバーは起動させる（他の機能は動作させる）
        logger.warning("⚠️ Firebase機能は無効化されますが、サーバーは継続します")
        raise

# Firebase Admin SDKの初期化はapps.pyのready()メソッドで実行されます

def verify_firebase_token(id_token):
    """
    Firebase IDトークンを検証
    """
    try:
        logger.info(f"🔐 Firebase IDトークン検証開始: token長={len(id_token) if id_token else 0}")
        
        # Firebase Admin SDKが初期化されているかチェック
        if not firebase_admin._apps:
            logger.error("❌ Firebase Admin SDKが初期化されていません")
            logger.info("🔄 Firebase Admin SDK初期化を試行中...")
            try:
                initialize_firebase()
                logger.info("✅ Firebase Admin SDK初期化完了")
            except Exception as init_error:
                logger.error(f"❌ Firebase Admin SDK初期化失敗: {str(init_error)}")
                return None
        else:
            logger.info(f"✅ Firebase Admin SDK初期化済み: {len(firebase_admin._apps)} app(s)")
        
        # IDトークンの基本チェック
        if not id_token:
            logger.error("❌ IDトークンが空です")
            return None
            
        if not id_token.startswith('eyJ'):
            logger.error(f"❌ IDトークンの形式が不正です: {id_token[:20]}...")
            return None
        
        logger.info("🔍 Firebase IDトークン検証実行中...")
        # IDトークンを検証（clock_skew_toleranceはサポートされていないバージョンのため削除）
        decoded_token = firebase_auth.verify_id_token(id_token)
        logger.info(f"✅ Firebase IDトークン検証成功: UID={decoded_token.get('uid', 'unknown')}")
        return decoded_token
        
    except firebase_auth.InvalidIdTokenError as e:
        logger.error(f"❌ 無効なIDトークン: {str(e)}")
        return None
    except firebase_auth.ExpiredIdTokenError as e:
        logger.error(f"❌ 期限切れIDトークン: {str(e)}")
        return None
    except firebase_auth.RevokedIdTokenError as e:
        logger.error(f"❌ 取り消されたIDトークン: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"❌ Firebase IDトークン検証で予期しないエラー: {type(e).__name__}: {str(e)}")
        return None

@api_view(['POST'])
@permission_classes([AllowAny])
def check_user_exists(request):
    """
    Firebase認証されたユーザーがアプリケーションに登録済みかチェック
    """
    try:
        logger.info("🔍 === check_user_exists開始 ===")
        
        # Authorization headerからトークンを取得
        auth_header = request.headers.get('Authorization', '')
        logger.info(f"📋 Authorization header: {auth_header[:50]}...")
        
        if not auth_header.startswith('Bearer '):
            logger.warning("❌ Authorizationヘッダーが不正")
            return Response({
                'success': False,
                'message': 'Authorizationヘッダーが必要です'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        id_token = auth_header.replace('Bearer ', '')
        logger.info(f"🔐 受信したIDトークン長: {len(id_token)}")
        logger.info(f"🔐 IDトークン先頭: {id_token[:50]}...")
        
        # リクエストボディからユーザー情報を取得（IDトークン検証失敗時でも使用）
        data = json.loads(request.body)
        firebase_uid = data.get('firebaseUid')
        phone_number = data.get('phoneNumber')
        
        logger.info(f"📋 リクエストデータ: firebase_uid={firebase_uid}, phone_number={phone_number}")
        
        # Firebase IDトークンを検証（失敗してもユーザー検索は継続）
        logger.info("🔥 Firebase IDトークン検証中...")
        decoded_token = verify_firebase_token(id_token)
        if not decoded_token:
            logger.warning("⚠️ Firebase IDトークン検証失敗、但しユーザー検索は継続")
            # IDトークン検証が失敗してもユーザー検索処理は継続する
            # フロントエンドからのfirebaseUidとphoneNumberを信頼してユーザー検索を実行
        else:
            logger.info(f"✅ Firebase IDトークン検証成功: UID={decoded_token['uid']}")
            # IDトークンから取得したUIDとリクエストのUIDが一致するかチェック
            if decoded_token['uid'] != firebase_uid:
                logger.warning(f"⚠️ UIDの不一致: token={decoded_token['uid']} vs request={firebase_uid}")
        
        # Firebase UIDの基本チェック（IDトークン検証失敗時でも実行）
        if not firebase_uid:
            logger.error("❌ Firebase UIDが未設定")
            return Response({
                'success': False,
                'message': 'Firebase UIDが必要です'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # データベースでユーザーを検索（Firebase UIDで）
        logger.info(f"🔍 データベースでユーザー検索中: firebase_uid={firebase_uid}")
        try:
            phone_user = PhoneUser.objects.get(firebase_uid=firebase_uid)
            logger.info(f"👤 既存ユーザー発見（Firebase UID）: ID={phone_user.id}, nickname={phone_user.nickname}, phone={phone_user.phone_number}")
            
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
            logger.info(f"🔍 Firebase UIDでは見つからず、電話番号で検索: firebase_uid={firebase_uid}")
            
            # 電話番号で既存ユーザーを検索（Firebase UID統合前のユーザー対応）
            if phone_number:
                # 電話番号の正規化（+81形式から日本形式へ）
                normalized_phone = phone_number
                if phone_number.startswith('+81'):
                    normalized_phone = '0' + phone_number[3:]
                logger.info(f"📱 電話番号正規化: {phone_number} → {normalized_phone}")
                
                try:
                    # Firebase UIDを持たない既存の電話番号ユーザーを検索
                    existing_phone_user = PhoneUser.objects.filter(
                        phone_number=normalized_phone,
                        firebase_uid__isnull=True
                    ).first()
                    
                    if existing_phone_user:
                        logger.info(f"🔄 既存の電話番号ユーザー発見、Firebase UID統合中: ID={existing_phone_user.id}, nickname={existing_phone_user.nickname}")
                        
                        # Firebase UIDを既存ユーザーに関連付け
                        existing_phone_user.firebase_uid = firebase_uid
                        existing_phone_user.save()
                        
                        logger.info(f"✅ Firebase UID統合完了: {existing_phone_user.nickname} にUID={firebase_uid}を関連付け")
                        
                        # 統一クレジットシステムへの移行も実行
                        try:
                            from ..services.unified_credit_service import UnifiedCreditService
                            success, message = UnifiedCreditService.migrate_phone_user_to_unified(firebase_uid)
                            if success:
                                logger.info(f"✅ 統一クレジットシステム移行完了: {message}")
                            else:
                                logger.warning(f"⚠️ 統一クレジットシステム移行: {message}")
                        except Exception as e:
                            logger.error(f"❌ 統一クレジットシステム移行エラー: {str(e)}")
                        
                        # 既存ユーザーとして返す
                        return Response({
                            'success': True,
                            'exists': True,
                            'user': {
                                'id': str(existing_phone_user.id),
                                'nickname': existing_phone_user.nickname,
                                'phoneNumber': existing_phone_user.phone_number,
                                'isAdmin': existing_phone_user.is_admin
                            }
                        })
                    else:
                        # 同じ電話番号だが既にFirebase UIDを持つユーザーがいるかチェック
                        existing_users = PhoneUser.objects.filter(phone_number=normalized_phone)
                        if existing_users.exists():
                            logger.warning(f"⚠️ 同じ電話番号の別UIDユーザーが存在:")
                            for user in existing_users:
                                logger.warning(f"   - UID: {user.firebase_uid}, phone: {user.phone_number}, nickname: {user.nickname}")
                            
                            # 既存の電話番号ユーザーが別のFirebase UIDを持っている場合
                            # これは複雑な問題なので、とりあえず新規ユーザーとして扱う
                            logger.info(f"🆕 電話番号は既存だが別UID、新規ユーザーとして処理")
                        else:
                            logger.info(f"🆕 完全に新規の電話番号ユーザー")
                            
                except Exception as e:
                    logger.error(f"❌ 電話番号ユーザー検索エラー: {str(e)}")
            
            logger.info(f"🆕 新規ユーザー: firebase_uid={firebase_uid}")
            return Response({
                'success': True,
                'exists': False
            })
            
    except json.JSONDecodeError:
        logger.error("❌ JSONデコードエラー")
        return Response({
            'success': False,
            'message': '無効なリクエストです'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"💥 予期しないエラー: {str(e)}")
        return Response({
            'success': False,
            'message': 'サーバーエラーが発生しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def get_or_create_user_info(request):
    """
    Firebase認証されたユーザーの情報を取得または作成
    """
    try:
        logger.info("👤 === get_or_create_user_info開始 ===")
        
        # Authorization headerからトークンを取得
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            logger.warning("❌ Authorizationヘッダーが不正")
            return Response({
                'success': False,
                'message': 'Authorizationヘッダーが必要です'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        id_token = auth_header.replace('Bearer ', '')
        
        # Firebase IDトークンを検証
        logger.info("🔥 Firebase IDトークン検証中...")
        decoded_token = verify_firebase_token(id_token)
        if not decoded_token:
            logger.error("❌ Firebase IDトークン検証失敗")
            return Response({
                'success': False,
                'message': '無効なFirebaseトークンです'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        logger.info(f"✅ Firebase IDトークン検証成功: UID={decoded_token['uid']}")
        
        data = json.loads(request.body)
        firebase_uid = data.get('firebaseUid')
        phone_number = data.get('phoneNumber')
        nickname = data.get('nickname')
        
        logger.info(f"📞 リクエストデータ: firebase_uid={firebase_uid}, phone_number={phone_number}, nickname={nickname}")
        
        if not firebase_uid or firebase_uid != decoded_token['uid']:
            logger.error(f"❌ UID不一致: request={firebase_uid}, token={decoded_token['uid']}")
            return Response({
                'success': False,
                'message': 'トークンとUIDが一致しません'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 既存ユーザーを検索
        logger.info(f"🔍 既存ユーザー検索中: firebase_uid={firebase_uid}")
        try:
            phone_user = PhoneUser.objects.get(firebase_uid=firebase_uid)
            logger.info(f"👤 既存ユーザー発見: ID={phone_user.id}, nickname={phone_user.nickname}")
            
            # 統一クレジットシステムからクレジット残高を取得
            credit_balance = UnifiedCreditService.get_user_credits(firebase_uid)
            
            # 既存ユーザーの場合
            return Response({
                'success': True,
                'id': str(phone_user.id),
                'nickname': phone_user.nickname,
                'phoneNumber': phone_user.phone_number,
                'isAdmin': phone_user.is_admin,
                'credits': credit_balance,
                'isNewUser': False
            })
        except PhoneUser.DoesNotExist:
            logger.info(f"🔍 Firebase UIDでは見つからず、電話番号で既存ユーザー検索: firebase_uid={firebase_uid}")
            
            # 新規ユーザーの場合
            if not nickname:
                logger.error("❌ ニックネームが未設定")
                return Response({
                    'success': False,
                    'message': 'ニックネームが必要です'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # ニックネームのバリデーション
            nickname = nickname.strip()
            if not nickname or len(nickname) > 20:
                logger.error(f"❌ ニックネーム不正: '{nickname}'")
                return Response({
                    'success': False,
                    'message': 'ニックネームは1文字以上20文字以内で入力してください'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 電話番号の正規化（+81形式から日本形式へ）
            original_phone = phone_number
            if phone_number and phone_number.startswith('+81'):
                phone_number = '0' + phone_number[3:]
            logger.info(f"📱 電話番号正規化: {original_phone} → {phone_number}")
            
            # 既存の電話番号ユーザーをチェック（Firebase UID統合前のユーザー対応）
            existing_phone_user = None
            if phone_number:
                try:
                    # Firebase UIDを持たない既存の電話番号ユーザーを検索
                    existing_phone_user = PhoneUser.objects.filter(
                        phone_number=phone_number,
                        firebase_uid__isnull=True
                    ).first()
                    
                    if existing_phone_user:
                        logger.info(f"🔄 既存の電話番号ユーザー発見、Firebase UID統合とニックネーム更新中: ID={existing_phone_user.id}, old_nickname={existing_phone_user.nickname}")
                        
                        # Firebase UIDを既存ユーザーに関連付け、ニックネームも更新
                        existing_phone_user.firebase_uid = firebase_uid
                        existing_phone_user.nickname = nickname  # ニックネームも更新
                        existing_phone_user.save()
                        
                        logger.info(f"✅ Firebase UID統合とニックネーム更新完了: {existing_phone_user.nickname} にUID={firebase_uid}を関連付け")
                        
                        # 統一クレジットシステムへの移行も実行
                        try:
                            success, message = UnifiedCreditService.migrate_phone_user_to_unified(firebase_uid)
                            if success:
                                logger.info(f"✅ 統一クレジットシステム移行完了: {message}")
                            else:
                                logger.warning(f"⚠️ 統一クレジットシステム移行: {message}")
                        except Exception as e:
                            logger.error(f"❌ 統一クレジットシステム移行エラー: {str(e)}")
                        
                        # 統一クレジットシステムから最新のクレジット残高を取得
                        credit_balance = UnifiedCreditService.get_user_credits(firebase_uid)
                        
                        # 既存ユーザー（統合済み）として返す
                        return Response({
                            'success': True,
                            'id': str(existing_phone_user.id),
                            'nickname': existing_phone_user.nickname,
                            'phoneNumber': existing_phone_user.phone_number,
                            'isAdmin': existing_phone_user.is_admin,
                            'credits': credit_balance,
                            'isNewUser': False  # 既存ユーザーなのでFalse
                        })
                    else:
                        # 同じ電話番号だが既にFirebase UIDを持つユーザーがいるかチェック
                        existing_users = PhoneUser.objects.filter(phone_number=phone_number)
                        if existing_users.exists():
                            logger.warning(f"⚠️ 同じ電話番号の別UIDユーザーが存在:")
                            for user in existing_users:
                                logger.warning(f"   - UID: {user.firebase_uid}, phone: {user.phone_number}, nickname: {user.nickname}")
                            
                            # 重複する電話番号の場合はエラーを返す
                            return Response({
                                'success': False,
                                'message': 'この電話番号は既に別のアカウントで使用されています'
                            }, status=status.HTTP_400_BAD_REQUEST)
                            
                except Exception as e:
                    logger.error(f"❌ 電話番号ユーザー検索エラー: {str(e)}")
            
            # 完全に新規のユーザーを作成
            logger.info(f"💾 完全に新規ユーザー作成: UID={firebase_uid}, phone={phone_number}, nickname={nickname}")
            phone_user = PhoneUser.objects.create(
                firebase_uid=firebase_uid,
                phone_number=phone_number or '',
                nickname=nickname,
                is_admin=False,
                credits=100  # 後方互換のため残す
            )
            
            logger.info(f"✅ 新規ユーザー作成完了: ID={phone_user.id}")
            
            # 統一クレジットシステムに初期クレジットを追加
            try:
                success, message = UnifiedCreditService.add_credits(
                    user_id=firebase_uid,
                    amount=100,
                    description=f"新規ユーザー登録ボーナス: {nickname}",
                    transaction_type='bonus'
                )
                if success:
                    logger.info(f"✅ 統一クレジットシステムに初期クレジット追加: {message}")
                else:
                    logger.error(f"❌ 統一クレジットシステムへの初期クレジット追加失敗: {message}")
            except Exception as e:
                logger.error(f"❌ 統一クレジットシステムエラー: {str(e)}")
            
            # 統一クレジットシステムから最新のクレジット残高を取得
            credit_balance = UnifiedCreditService.get_user_credits(firebase_uid)
            
            return Response({
                'success': True,
                'id': str(phone_user.id),
                'nickname': phone_user.nickname,
                'phoneNumber': phone_user.phone_number,
                'isAdmin': phone_user.is_admin,
                'credits': credit_balance,
                'isNewUser': True
            })
            
    except json.JSONDecodeError:
        logger.error("❌ JSONデコードエラー")
        return Response({
            'success': False,
            'message': '無効なリクエストです'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"💥 予期しないエラー: {str(e)}")
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