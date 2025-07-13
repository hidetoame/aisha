import json
import uuid
from datetime import timedelta
from django.conf import settings
from google.cloud import storage
from google.oauth2 import service_account
import logging

logger = logging.getLogger(__name__)


class GCSUploadService:
    """Google Cloud Storageファイルアップロードサービス"""
    
    def __init__(self):
        """GCSクライアントを初期化"""
        try:
            # サービスアカウントキーの認証情報を取得
            if settings.GCS_CREDENTIALS_JSON:
                if settings.GCS_CREDENTIALS_JSON.startswith('{'):
                    # JSON文字列として解析
                    credentials_info = json.loads(settings.GCS_CREDENTIALS_JSON)
                    credentials = service_account.Credentials.from_service_account_info(credentials_info)
                else:
                    # ファイルパスとして解析
                    credentials = service_account.Credentials.from_service_account_file(settings.GCS_CREDENTIALS_JSON)
                
                self.client = storage.Client(
                    project=settings.GCS_PROJECT_ID,
                    credentials=credentials
                )
            else:
                # デフォルト認証（環境変数 GOOGLE_APPLICATION_CREDENTIALS を使用）
                self.client = storage.Client(project=settings.GCS_PROJECT_ID)
            
            self.bucket_name = settings.GCS_BUCKET_NAME
            self.bucket = self.client.bucket(self.bucket_name)
            
        except Exception as e:
            logger.error(f"GCS初期化エラー: {e}")
            # GCS設定が無い場合でもサーバー起動を継続
            self.client = None
            self.bucket = None
            self.bucket_name = None
            logger.warning("GCS設定が無効です。画像アップロード機能は利用できません。")
        
    def upload_car_setting_image(self, file, user_id: str, car_id: str, image_type: str) -> str:
        """
        愛車設定用画像をGoogle Cloud Storageにアップロード
        
        Args:
            file: アップロードするファイル
            user_id: ユーザーID
            car_id: 愛車ID
            image_type: 画像タイプ (logo_mark, original_number, car_photo_front, etc.)
            
        Returns:
            str: GCSのファイルURL
            
        Raises:
            Exception: アップロードに失敗した場合
        """
        try:
            if self.client is None or self.bucket is None:
                raise Exception("GCS設定が無効です。画像アップロード機能は利用できません。")
            
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
            
            # パブリック読み取り権限を設定
            blob.make_public()
            
            # パブリックURLを生成
            file_url = blob.public_url
            
            logger.info(f"GCSアップロード成功: {file_url}")
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
        try:
            if self.client is None or self.bucket is None:
                logger.warning("GCS設定が無効です。画像削除をスキップします。")
                return False
            
            # URLからブロブ名を抽出
            # 例: https://aisha-car-images.storage.googleapis.com/car-settings/...
            #  -> car-settings/...
            if settings.GCS_CUSTOM_DOMAIN in image_url:
                blob_name = image_url.replace(f"https://{settings.GCS_CUSTOM_DOMAIN}/", "")
            else:
                # fallback: 標準的なGCSのURL形式
                blob_name = image_url.split(f"{self.bucket_name}/")[-1]
            
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
        try:
            if self.client is None or self.bucket is None:
                raise Exception("GCS設定が無効です。署名付きURL生成機能は利用できません。")
            
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