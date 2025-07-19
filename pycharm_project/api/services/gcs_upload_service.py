import json
import uuid
import os
import requests
import tempfile
from datetime import timedelta
from django.conf import settings
from google.cloud import storage
from google.oauth2 import service_account
import logging
import codecs
from typing import Optional

logger = logging.getLogger(__name__)


class GCSUploadService:
    """Google Cloud Storageファイルアップロードサービス"""
    
    def __init__(self):
        """GCSUploadServiceのインスタンスを作成（遅延初期化）"""
        self.client = None
        self.bucket = None
        self.bucket_name = None
        self._initialized = False
    
    def _test_gcs_access(self, credentials, project_id: str, bucket_name: str) -> bool:
        """GCS認証情報が実際に使用可能かテストする"""
        try:
            logger.info("🧪 GCS権限テスト実行中...")
            test_client = storage.Client(project=project_id, credentials=credentials)
            test_bucket = test_client.bucket(bucket_name)
            
            # 複数の方法で権限をテスト
            test_methods = [
                ("bucket_reload", lambda: test_bucket.reload()),
                ("bucket_exists", lambda: test_bucket.exists()),
                ("list_blobs", lambda: list(test_client.list_blobs(bucket_name, max_results=1))),
                ("bucket_metadata", lambda: test_bucket.get_iam_policy()),
            ]
            
            for method_name, test_func in test_methods:
                try:
                    logger.info(f"🔍 {method_name}でテスト中...")
                    test_func()
                    logger.info(f"✅ {method_name}テスト成功！")
                    return True
                except Exception as method_error:
                    logger.warning(f"⚠️ {method_name}テストエラー: {method_error}")
                    continue
            
            logger.warning("⚠️ すべてのGCS権限テストが失敗")
            return False
            
        except Exception as test_error:
            logger.warning(f"⚠️ GCS権限テスト初期化エラー: {test_error}")
            return False

    def _parse_json_credentials(self, json_string: str) -> Optional[dict]:
        """JSON認証情報文字列を安全に解析する"""
        try:
            logger.info("📄 JSON文字列として認証情報を解析中...")
            
            # 複数の方法でエスケープシーケンスを処理
            methods = [
                ("raw_unicode_escape", lambda s: codecs.decode(s, 'raw_unicode_escape')),
                ("manual_replacement_v1", lambda s: s.replace('\\n', '\n').replace('\\t', '\t').replace('\\r', '\r').replace('\\\\', '\\')),
                ("manual_replacement_v2", lambda s: s.replace('\\\\n', '\n').replace('\\\\t', '\t').replace('\\\\r', '\r').replace('\\\\\\\\', '\\')),
                ("bytes_decode", lambda s: s.encode('utf-8').decode('unicode_escape')),
                ("json_loads_direct", lambda s: s),  # 直接試行
                ("ast_literal_eval", lambda s: __import__('ast').literal_eval(f'"{s}"') if s.startswith('"') and s.endswith('"') else s),
            ]
            
            for method_name, processor in methods:
                try:
                    logger.info(f"🔧 {method_name}方式を試行...")
                    processed_string = processor(json_string)
                    credentials_info = json.loads(processed_string)
                    
                    # 必要なフィールドの存在確認
                    required_fields = ['type', 'project_id', 'private_key', 'client_email']
                    missing_fields = [field for field in required_fields if field not in credentials_info]
                    if missing_fields:
                        logger.warning(f"⚠️ {method_name}: 必要なフィールドが不足: {missing_fields}")
                        continue
                    
                    # private_keyの妥当性チェック
                    private_key = credentials_info.get('private_key', '')
                    if not private_key.startswith('-----BEGIN PRIVATE KEY-----'):
                        logger.warning(f"⚠️ {method_name}: PEMフォーマットが無効")
                        continue
                    
                    logger.info(f"✅ {method_name}でのデコード成功")
                    return credentials_info
                    
                except Exception as method_error:
                    logger.warning(f"⚠️ {method_name}失敗: {method_error}")
                    continue
            
            logger.error("❌ すべてのJSON解析方法が失敗")
            return None
            
        except Exception as parse_error:
            logger.warning(f"⚠️ JSON文字列解析完全失敗: {parse_error}")
            return None

    def _try_credentials_with_test(self, credentials_info: dict, project_id: str, bucket_name: str) -> Optional[service_account.Credentials]:
        """認証情報を作成してGCSアクセステストを実行"""
        try:
            service_account_email = credentials_info.get('client_email', '')
            logger.info(f"🔑 サービスアカウント: {service_account_email}")
            
            # 認証情報を作成
            credentials = service_account.Credentials.from_service_account_info(credentials_info)
            
            # 実際にGCSアクセスをテスト
            if self._test_gcs_access(credentials, project_id, bucket_name):
                logger.info(f"✅ 認証情報が有効です: {service_account_email}")
                return credentials
            else:
                logger.warning(f"⚠️ 認証情報のGCSアクセス権限が不足: {service_account_email}")
                return None
                
        except Exception as cred_error:
            logger.error(f"❌ 認証情報作成/テストエラー: {cred_error}")
            return None
    
    def _ensure_initialized(self):
        """GCSクライアントの初期化（Firebase認証と分離）"""
        if self._initialized:
            return
            
        logger.info("🔧 === GCS初期化を開始します（Firebase認証と分離） ===")
        
        # Django設定から取得
        gcs_project_id = settings.GCS_PROJECT_ID
        gcs_bucket_name = settings.GCS_BUCKET_NAME
        gcs_credentials_json = getattr(settings, 'GCS_CREDENTIALS_JSON', None)
        
        logger.info("📋 Django設定確認:")
        logger.info(f"   - GCS_PROJECT_ID: {gcs_project_id}")
        logger.info(f"   - GCS_BUCKET_NAME: {gcs_bucket_name}")
        logger.info(f"   - GCS_CREDENTIALS_JSON存在: {bool(gcs_credentials_json)}")
        
        credentials = None
            
        # ⭐ 方法1（優先）: Django設定のGCS_CREDENTIALS_JSONを使用
        if gcs_credentials_json:
            logger.info("🎯 GCS専用認証情報を使用（Firebase認証と分離）")
            logger.info(f"📋 GCS_CREDENTIALS_JSON 詳細:")
            logger.info(f"   - 長さ: {len(gcs_credentials_json)} 文字")
            logger.info(f"   - 最初の10文字: {gcs_credentials_json[:10]}")
            logger.info(f"   - 最後の10文字: {gcs_credentials_json[-10:]}")
            
            # JSON文字列として解析を試行
            is_json_string = (
                gcs_credentials_json.strip().startswith('{') and 
                gcs_credentials_json.strip().endswith('}') and
                len(gcs_credentials_json) > 100
            )
            
            if is_json_string:
                credentials_info = self._parse_json_credentials(gcs_credentials_json)
                if credentials_info:
                    credentials = self._try_credentials_with_test(credentials_info, gcs_project_id, gcs_bucket_name)
            
            # JSON文字列として失敗した場合、ファイルパスとして試行
            if not credentials and os.path.exists(gcs_credentials_json):
                logger.info(f"🔄 ファイルパスとして再試行: {gcs_credentials_json}")
                try:
                    with open(gcs_credentials_json, 'r') as f:
                        credentials_info = json.load(f)
                    credentials = self._try_credentials_with_test(credentials_info, gcs_project_id, gcs_bucket_name)
                except Exception as file_error:
                    logger.error(f"❌ ファイル読み込みエラー: {file_error}")
            
        # ⭐ 方法2（フォールバック）: 利用可能なファイルを順次試行
        fallback_paths = [
            '/app/gcs-credentials.json',
            '/app/service-account.json', 
            './gcs-credentials.json',
            './service-account.json'
        ]
        
        if not credentials:
            logger.info("🔄 フォールバック認証ファイルを順次試行...")
            for fallback_path in fallback_paths:
                if os.path.exists(fallback_path):
                    try:
                        logger.info(f"📁 フォールバックファイル試行: {fallback_path}")
                        
                        with open(fallback_path, 'r') as f:
                            credentials_info = json.load(f)
                        
                        # 実際にアクセステストを実行（サービスアカウント種別に関係なく）
                        test_credentials = self._try_credentials_with_test(credentials_info, gcs_project_id, gcs_bucket_name)
                        if test_credentials:
                            credentials = test_credentials
                            logger.info(f"✅ フォールバック認証成功: {fallback_path}")
                            break
                        else:
                            logger.warning(f"⚠️ {fallback_path} は権限不足のため使用不可")
                            
                    except Exception as fb_error:
                        logger.warning(f"⚠️ フォールバックファイル失敗: {fallback_path} - {fb_error}")
                        continue
        
        # 最終確認
        if not credentials:
            logger.error("❌ すべての認証方法が失敗しました")
            logger.error("📋 確認されたファイル:")
            check_files = ['/app/gcs-credentials.json', '/app/service-account.json'] + fallback_paths
            for check_file in check_files:
                exists = os.path.exists(check_file)
                logger.error(f"   - {check_file}: {'存在' if exists else '存在しない'}")
            raise Exception("GCS認証情報が設定されていません")
        
        # サービスアカウント情報をログ出力
        if hasattr(credentials, 'service_account_email'):
            logger.info(f"🔑 使用するサービスアカウント: {credentials.service_account_email}")
        
        # GCSクライアントの作成
        logger.info("🔨 GCS専用クライアント作成中...")
        self.client = storage.Client(
            project=gcs_project_id,
            credentials=credentials
        )
        logger.info("✅ GCS専用クライアント作成成功")
        
        # バケットの設定
        self.bucket_name = gcs_bucket_name
        self.bucket = self.client.bucket(self.bucket_name)
            
        # 最終的なバケット確認（初期化完了のため）
        logger.info(f"🪣 バケット最終確認中: {self.bucket_name}")
        try:
            # bucket.reload()の代わりに、成功したlist_blobsを使用
            list(self.client.list_blobs(self.bucket_name, max_results=1))
            logger.info("✅ GCS初期化完了")
            self._initialized = True
        except Exception as bucket_error:
            logger.error(f"❌ バケット確認エラー: {bucket_error}")
            logger.error("❌ === GCS初期化エラー ===")
            logger.error(f"💥 エラータイプ: {type(bucket_error).__name__}")
            logger.error(f"💥 エラーメッセージ: {bucket_error}")
            
            # 環境変数情報の出力（デバッグ用）
            google_app_creds = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
            if google_app_creds:
                logger.warning(f"⚠️ GOOGLE_APPLICATION_CREDENTIALS設定値: {google_app_creds}")
                logger.warning("⚠️ Firebase認証との競合が発生している可能性があります")
            
            raise Exception(f"Google Cloud Storage初期化失敗: {bucket_error}")
    
    def upload_generated_image_from_url(self, image_url: str, user_id: str, frontend_id: str) -> str:
        """
        生成画像をURLからダウンロードしてGoogle Cloud Storageにアップロード
        
        Args:
            image_url: ダウンロードする画像のURL
            user_id: ユーザーID
            frontend_id: フロントエンドの画像ID
            
        Returns:
            str: GCSのパブリックURL
            
        Raises:
            Exception: ダウンロードまたはアップロードに失敗した場合
        """
        logger.info(f"🖼️ === upload_generated_image_from_url開始 ===")
        logger.info(f"📤 image_url: {image_url}")
        logger.info(f"👤 user_id: {user_id}")
        logger.info(f"🆔 frontend_id: {frontend_id}")
        
        self._ensure_initialized()
        try:
            logger.info(f"📥 生成画像ダウンロード開始: {image_url}")
            
            # 画像をダウンロード
            logger.info("🌐 HTTP GETリクエスト実行中...")
            response = requests.get(image_url, timeout=30)
            logger.info(f"📡 HTTPレスポンス: {response.status_code} {response.reason}")
            response.raise_for_status()
            
            # Content-Typeから拡張子を判定
            content_type = response.headers.get('content-type', 'image/jpeg')
            logger.info(f"📄 Content-Type: {content_type}")
            file_extension = self._get_extension_from_content_type(content_type)
            logger.info(f"📎 ファイル拡張子: {file_extension}")
            
            # データサイズをログ
            content_length = len(response.content)
            logger.info(f"📊 ダウンロードデータサイズ: {content_length} bytes")
            
            # GCSオブジェクト名を生成
            unique_filename = f"{frontend_id}{file_extension}"
            blob_name = f"generated-images/{user_id}/{unique_filename}"
            
            logger.info(f"📁 GCSアップロード開始:")
            logger.info(f"   - blob_name: {blob_name}")
            logger.info(f"   - content_type: {content_type}")
            
            # GCSにアップロード
            logger.info("☁️ GCSブロブ作成中...")
            blob = self.bucket.blob(blob_name)
            blob.content_type = content_type
            
            # バイトデータを直接アップロード
            logger.info("⬆️ データアップロード実行中...")
            blob.upload_from_string(response.content, content_type=content_type)
            logger.info("✅ データアップロード完了")
            
            # パブリック読み取り権限を設定
            logger.info("🔓 パブリック権限設定中...")
            blob.make_public()
            logger.info("✅ パブリック権限設定完了")
            
            # パブリックURLを生成
            file_url = blob.public_url
            
            logger.info(f"🎉 === 生成画像GCSアップロード成功 ===")
            logger.info(f"🔗 blob_name: {blob_name}")
            logger.info(f"🔗 public_url: {file_url}")
            return file_url
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ === 画像ダウンロードエラー ===")
            logger.error(f"💥 エラータイプ: {type(e).__name__}")
            logger.error(f"💥 エラーメッセージ: {str(e)}")
            logger.error(f"📤 問題のURL: {image_url}")
            raise Exception(f"画像ダウンロード失敗: {str(e)}")
        except Exception as e:
            logger.error(f"❌ === 生成画像GCSアップロードエラー ===")
            logger.error(f"💥 エラータイプ: {type(e).__name__}")
            logger.error(f"💥 エラーメッセージ: {str(e)}")
            logger.error(f"💥 エラー詳細: {e}")
            
            # Firebase関連エラーかチェック
            error_str = str(e).lower()
            if any(keyword in error_str for keyword in ['firebase', 'credential', 'authentication']):
                logger.error("🔥 Firebase認証競合の可能性あり!")
                
            # 環境変数も確認
            google_creds = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
            logger.error(f"🔑 エラー時のGOOGLE_APPLICATION_CREDENTIALS: {google_creds}")
            
            raise Exception(f"Google Cloud Storageアップロード失敗: {str(e)}")
    
    def upload_car_setting_image(self, file, user_id: str, car_id: str, image_type: str) -> str:
        """
        愛車設定用画像をGoogle Cloud Storageにアップロード
        
        Args:
            file: アップロードするファイル
            user_id: ユーザーID
            car_id: 愛車ID
            image_type: 画像タイプ (logo_mark, original_number, car_photo_front, etc.)
            
        Returns:
            str: GCSのパブリックURL
            
        Raises:
            Exception: アップロードに失敗した場合
        """
        self._ensure_initialized()
        try:
            # ファイル拡張子を取得
            file_extension = self._get_file_extension(file.name)
            
            # GCSオブジェクト名を生成（ユニークなファイル名）
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            blob_name = f"car-settings/{user_id}/{car_id}/{image_type}/{unique_filename}"
            
            # GCSにアップロード
            blob = self.bucket.blob(blob_name)
            
            # Content-Typeを設定
            blob.content_type = self._get_content_type(file_extension)
            
            # ファイルの先頭にシークを戻す
            file.seek(0)
            
            # アップロード実行
            blob.upload_from_file(file)
            
            # パブリック読み取り権限を設定（ACLベースで動作）
            blob.make_public()
            
            # パブリックURLを生成
            file_url = blob.public_url
            
            logger.info(f"GCSアップロード成功: {blob_name}")
            logger.info(f"パブリックURL: {file_url}")
            return file_url
            
        except Exception as e:
            logger.error(f"GCSアップロードエラー: {e}")
            raise Exception(f"Google Cloud Storageアップロード失敗: {str(e)}")
    
    def delete_car_setting_image(self, image_url: str) -> bool:
        """
        Google Cloud Storageから愛車設定用画像を削除
        
        Args:
            image_url: 削除するファイルのURL
            
        Returns:
            bool: 削除成功かどうか
        """
        self._ensure_initialized()
        try:
            logger.info(f"🗑️ GCS画像削除開始: {image_url}")
            
            # URLからブロブ名を抽出
            blob_name = None
            
            # 例: https://storage.googleapis.com/aisha-car-images/car-settings/...
            if "storage.googleapis.com" in image_url:
                logger.info("📍 storage.googleapis.com形式のURLを解析中...")
                # URLを解析してブロブ名を抽出
                url_parts = image_url.split(f"{self.bucket_name}/")
                logger.info(f"🔍 URL分割結果: {url_parts}")
                if len(url_parts) > 1:
                    blob_name = url_parts[1]
                    logger.info(f"✅ ブロブ名抽出成功: {blob_name}")
                else:
                    logger.error(f"❌ URLからブロブ名を抽出できません: {image_url}")
                    return False
            elif hasattr(settings, 'GCS_CUSTOM_DOMAIN') and settings.GCS_CUSTOM_DOMAIN in image_url:
                logger.info("📍 カスタムドメイン形式のURLを解析中...")
                blob_name = image_url.replace(f"https://{settings.GCS_CUSTOM_DOMAIN}/", "")
                logger.info(f"✅ ブロブ名抽出成功: {blob_name}")
            else:
                logger.error(f"❌ 未対応のURL形式: {image_url}")
                return False
            
            if not blob_name:
                logger.error("❌ ブロブ名が空です")
                return False
            
            # GCSから削除
            logger.info(f"🔄 GCSブロブ取得中: {blob_name}")
            blob = self.bucket.blob(blob_name)
            
            logger.info("🔍 ブロブ存在確認中...")
            if blob.exists():
                logger.info("📁 ブロブが存在します。削除実行中...")
                blob.delete()
                logger.info(f"✅ GCS削除成功: {blob_name}")
                return True
            else:
                logger.warning(f"⚠️ GCS削除対象が存在しません: {blob_name}")
                return False
            
        except Exception as e:
            logger.error(f"❌ GCS削除エラー: {e}")
            logger.error(f"❌ エラー詳細: type={type(e)}, args={e.args}")
            return False
    
    def delete_generated_image(self, image_url: str) -> bool:
        """
        Google Cloud Storageから生成画像を削除
        
        Args:
            image_url: 削除するファイルのURL
            
        Returns:
            bool: 削除成功かどうか
        """
        # 愛車設定画像削除と同じロジックを使用
        return self.delete_car_setting_image(image_url)
    
    def generate_signed_url(self, blob_name: str, expiration_minutes: int = 60) -> str:
        """
        署名付きURLを生成（一時的なプライベートアクセス用）
        
        Args:
            blob_name: GCSオブジェクト名
            expiration_minutes: 有効期限（分）
            
        Returns:
            str: 署名付きURL
        """
        self._ensure_initialized()
        try:
            blob = self.bucket.blob(blob_name)
            
            signed_url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(minutes=expiration_minutes),
                method="GET"
            )
            
            return signed_url
            
        except Exception as e:
            logger.error(f"署名付きURL生成エラー: {e}")
            raise Exception(f"署名付きURL生成失敗: {str(e)}")
    
    def _get_file_extension(self, filename: str) -> str:
        """ファイル拡張子を取得"""
        if '.' in filename:
            return '.' + filename.rsplit('.', 1)[1].lower()
        return ''
    
    def _get_content_type(self, file_extension: str) -> str:
        """ファイル拡張子に基づいてContent-Typeを決定"""
        content_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
        }
        return content_types.get(file_extension.lower(), 'image/jpeg')
    
    def _get_extension_from_content_type(self, content_type: str) -> str:
        """Content-Typeに基づいてファイル拡張子を決定"""
        content_type_map = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
        }
        return content_type_map.get(content_type.lower(), '.jpg')
    
    def upload_image_from_bytes(self, image_data: bytes, user_id: str, frontend_id: str, file_extension: str = '.jpg') -> str:
        """
        バイナリデータから生成画像をGoogle Cloud Storageにアップロード
        
        Args:
            image_data: 画像のバイナリデータ
            user_id: ユーザーID
            frontend_id: フロントエンドの画像ID
            file_extension: ファイル拡張子（デフォルト: .jpg）
            
        Returns:
            str: GCSのパブリックURL
            
        Raises:
            Exception: アップロードに失敗した場合
        """
        self._ensure_initialized()
        try:
            # GCSオブジェクト名を生成
            unique_filename = f"{frontend_id}{file_extension}"
            blob_name = f"generated-images/{user_id}/{unique_filename}"
            
            logger.info(f"📁 GCSアップロード開始: {blob_name}")
            
            # GCSにアップロード
            blob = self.bucket.blob(blob_name)
            blob.content_type = self._get_content_type(file_extension)
            
            # バイトデータを直接アップロード
            blob.upload_from_string(image_data, content_type=blob.content_type)
            
            # パブリック読み取り権限を設定
            blob.make_public()
            
            # パブリックURLを生成
            file_url = blob.public_url
            
            logger.info(f"✅ バイナリデータGCSアップロード成功: {blob_name}")
            logger.info(f"🔗 パブリックURL: {file_url}")
            return file_url
            
        except Exception as e:
            logger.error(f"❌ バイナリデータGCSアップロードエラー: {e}")
            raise Exception(f"Google Cloud Storageアップロード失敗: {str(e)}")


# シングルトンインスタンス
gcs_upload_service = GCSUploadService()
