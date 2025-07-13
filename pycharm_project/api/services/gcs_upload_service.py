import json
import uuid
import os
from datetime import timedelta
from django.conf import settings
from google.cloud import storage
from google.oauth2 import service_account
import logging

logger = logging.getLogger(__name__)


class GCSUploadService:
    """Google Cloud Storageファイルアップロードサービス"""
    
    def __init__(self):
        """GCSUploadServiceのインスタンスを作成（遅延初期化）"""
        self.client = None
        self.bucket = None
        self.bucket_name = None
        self._initialized = False
    
    def _ensure_initialized(self):
        """GCS接続の初期化（必要時のみ実行）"""
        if self._initialized:
            return
            
        try:
            credentials = None
            
            # 方法1: GOOGLE_APPLICATION_CREDENTIALS環境変数を優先使用
            google_app_creds = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
            if google_app_creds and os.path.exists(google_app_creds):
                logger.info(f"GOOGLE_APPLICATION_CREDENTIALS使用: {google_app_creds}")
                credentials = service_account.Credentials.from_service_account_file(google_app_creds)
            
            # 方法2: Django設定のGCS_CREDENTIALS_JSONをフォールバック
            elif settings.GCS_CREDENTIALS_JSON:
                logger.info("GCS_CREDENTIALS_JSON使用")
                if settings.GCS_CREDENTIALS_JSON.startswith('{'):
                    # JSON文字列として解析
                    credentials_info = json.loads(settings.GCS_CREDENTIALS_JSON)
                    credentials = service_account.Credentials.from_service_account_info(credentials_info)
                else:
                    # ファイルパスとして解析
                    credentials = service_account.Credentials.from_service_account_file(settings.GCS_CREDENTIALS_JSON)
            
            # GCSクライアントの作成
            if credentials:
                self.client = storage.Client(
                    project=settings.GCS_PROJECT_ID,
                    credentials=credentials
                )
                logger.info("GCSクライアント作成成功（認証情報使用）")
            else:
                # デフォルト認証（ADC: Application Default Credentials）
                self.client = storage.Client(project=settings.GCS_PROJECT_ID)
                logger.info("GCSクライアント作成成功（デフォルト認証）")
            
            self.bucket_name = settings.GCS_BUCKET_NAME
            self.bucket = self.client.bucket(self.bucket_name)
            
            # バケットの存在確認
            if self.bucket.exists():
                logger.info(f"GCSバケット接続成功: {self.bucket_name}")
                self._initialized = True
            else:
                raise Exception(f"バケット '{self.bucket_name}' が存在しません")
            
        except Exception as e:
            logger.error(f"GCS初期化エラー: {e}")
            raise Exception(f"Google Cloud Storage初期化失敗: {str(e)}")
        
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
            # URLからブロブ名を抽出
            # 例: https://storage.googleapis.com/aisha-car-images/car-settings/...
            if "storage.googleapis.com" in image_url:
                # URLを解析してブロブ名を抽出
                url_parts = image_url.split(f"{self.bucket_name}/")
                if len(url_parts) > 1:
                    blob_name = url_parts[1]
                else:
                    logger.error(f"URLからブロブ名を抽出できません: {image_url}")
                    return False
            elif settings.GCS_CUSTOM_DOMAIN in image_url:
                blob_name = image_url.replace(f"https://{settings.GCS_CUSTOM_DOMAIN}/", "")
            else:
                logger.error(f"未対応のURL形式: {image_url}")
                return False
            
            # GCSから削除
            blob = self.bucket.blob(blob_name)
            if blob.exists():
                blob.delete()
                logger.info(f"GCS削除成功: {blob_name}")
                return True
            else:
                logger.warning(f"GCS削除対象が存在しません: {blob_name}")
                return False
            
        except Exception as e:
            logger.error(f"GCS削除エラー: {e}")
            return False
    
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


# サービスインスタンスを作成
gcs_upload_service = GCSUploadService()
