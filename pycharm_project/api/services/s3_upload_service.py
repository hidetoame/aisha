import boto3
import uuid
from django.conf import settings
from botocore.exceptions import ClientError, NoCredentialsError
import logging

logger = logging.getLogger(__name__)


class S3UploadService:
    """S3ファイルアップロードサービス"""
    
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        
    def upload_car_setting_image(self, file, user_id: str, car_id: str, image_type: str) -> str:
        """
        愛車設定用画像をS3にアップロード
        
        Args:
            file: アップロードするファイル
            user_id: ユーザーID
            car_id: 愛車ID
            image_type: 画像タイプ (logo_mark, original_number, car_photo_front, etc.)
            
        Returns:
            str: S3のファイルURL
            
        Raises:
            Exception: アップロードに失敗した場合
        """
        try:
            # ファイル拡張子を取得
            file_extension = self._get_file_extension(file.name)
            
            # S3キーを生成（ユニークなファイル名）
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            s3_key = f"car-settings/{user_id}/{car_id}/{image_type}/{unique_filename}"
            
            # S3にアップロード
            self.s3_client.upload_fileobj(
                file,
                self.bucket_name,
                s3_key,
                ExtraArgs={
                    'ACL': settings.AWS_DEFAULT_ACL,
                    'ContentType': self._get_content_type(file_extension),
                    **settings.AWS_S3_OBJECT_PARAMETERS
                }
            )
            
            # アップロードされたファイルのURLを生成
            file_url = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{s3_key}"
            
            logger.info(f"S3アップロード成功: {file_url}")
            return file_url
            
        except NoCredentialsError:
            logger.error("AWS認証情報が設定されていません")
            raise Exception("S3アップロード失敗: AWS認証情報エラー")
            
        except ClientError as e:
            logger.error(f"S3クライアントエラー: {e}")
            raise Exception(f"S3アップロード失敗: {str(e)}")
            
        except Exception as e:
            logger.error(f"S3アップロード予期しないエラー: {e}")
            raise Exception(f"S3アップロード失敗: {str(e)}")
    
    def delete_car_setting_image(self, image_url: str) -> bool:
        """
        S3から愛車設定用画像を削除
        
        Args:
            image_url: 削除するファイルのURL
            
        Returns:
            bool: 削除成功かどうか
        """
        try:
            # URLからS3キーを抽出
            s3_key = image_url.replace(f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/", "")
            
            # S3から削除
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            
            logger.info(f"S3削除成功: {s3_key}")
            return True
            
        except Exception as e:
            logger.error(f"S3削除エラー: {e}")
            return False
    
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


# シングルトンインスタンス
s3_upload_service = S3UploadService() 