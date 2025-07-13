import os
import requests
import logging
from typing import Tuple, Dict, Any
from django.conf import settings
from PIL import Image
import io
import tempfile

logger = logging.getLogger(__name__)

# Anchor position mapping
ANCHOR_POSITIONS = {
    'top-left': (0, 0),
    'top-center': (0.5, 0),
    'top-right': (1, 0),
    'mid-left': (0, 0.5),
    'center': (0.5, 0.5),
    'mid-right': (1, 0.5),
    'bottom-left': (0, 1),
    'bottom-center': (0.5, 1),
    'bottom-right': (1, 1),
}

class ClipdropService:
    def __init__(self):
        self.api_key = os.getenv('CLIPDROP_API_KEY')
        if not self.api_key or self.api_key == 'your_clipdrop_api_key_here':
            raise ValueError('CLIPDROP_API_KEYが設定されていないか、デフォルト値のままです。実際のAPIキーを設定してください。')
        
        self.base_url = 'https://clipdrop-api.co'
        self.uncrop_endpoint = f'{self.base_url}/uncrop/v1'
    
    def calculate_expansion_params(self, width: int, height: int, anchor_position: str, expansion_factor: float = 1.25) -> Dict[str, int]:
        """
        アンカーポジションに基づいて拡張パラメータを計算
        
        Args:
            width: 元画像の幅
            height: 元画像の高さ
            anchor_position: アンカーポジション ('center', 'top-left', etc.)
            expansion_factor: 拡張倍率 (デフォルト: 1.25)
        
        Returns:
            extend_left, extend_right, extend_up, extend_downのパラメータ辞書
        """
        if anchor_position not in ANCHOR_POSITIONS:
            logger.warning(f"Unknown anchor position: {anchor_position}, defaulting to center")
            anchor_position = 'center'
        
        # 新しいサイズを計算
        new_width = int(width * expansion_factor)
        new_height = int(height * expansion_factor)
        
        # 総拡張量
        width_expansion = new_width - width
        height_expansion = new_height - height
        
        # アンカーポジションの座標を取得 (0.0-1.0)
        anchor_x, anchor_y = ANCHOR_POSITIONS[anchor_position]
        
        # 拡張量を分配
        extend_left = int(width_expansion * anchor_x)
        extend_right = width_expansion - extend_left
        extend_up = int(height_expansion * anchor_y)
        extend_down = height_expansion - extend_up
        
        return {
            'extend_left': extend_left,
            'extend_right': extend_right,
            'extend_up': extend_up,
            'extend_down': extend_down
        }
    
    def get_image_dimensions(self, image_url: str) -> Tuple[int, int]:
        """
        画像のサイズを取得
        
        Args:
            image_url: 画像URL
            
        Returns:
            (width, height) のタプル
        """
        try:
            response = requests.get(image_url, stream=True, timeout=30)
            response.raise_for_status()
            
            with Image.open(io.BytesIO(response.content)) as img:
                return img.size
        except Exception as e:
            logger.error(f"画像サイズ取得エラー: {e}")
            raise ValueError(f"画像サイズの取得に失敗しました: {e}")
    
    def download_image(self, image_url: str) -> bytes:
        """
        画像をダウンロード
        
        Args:
            image_url: 画像URL
            
        Returns:
            画像のバイナリデータ
        """
        try:
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            return response.content
        except Exception as e:
            logger.error(f"画像ダウンロードエラー: {e}")
            raise ValueError(f"画像のダウンロードに失敗しました: {e}")
    
    def expand_image(self, image_url: str, anchor_position: str, expansion_factor: float = 1.25) -> bytes:
        """
        Clipdrop APIを使用して画像を拡張
        
        Args:
            image_url: 拡張する画像のURL
            anchor_position: アンカーポジション
            expansion_factor: 拡張倍率
            
        Returns:
            拡張された画像のバイナリデータ
        """
        try:
            # 1. 画像のサイズを取得
            width, height = self.get_image_dimensions(image_url)
            logger.info(f"元画像サイズ: {width}x{height}")
            
            # 2. 拡張パラメータを計算
            expand_params = self.calculate_expansion_params(width, height, anchor_position, expansion_factor)
            logger.info(f"拡張パラメータ: {expand_params}")
            
            # 3. 画像をダウンロード
            image_data = self.download_image(image_url)
            
            # 4. FormDataを作成
            files = {
                'image_file': ('image.jpg', io.BytesIO(image_data), 'image/jpeg')
            }
            
            data = {
                'extend_left': str(expand_params['extend_left']),
                'extend_right': str(expand_params['extend_right']),
                'extend_up': str(expand_params['extend_up']),
                'extend_down': str(expand_params['extend_down'])
            }
            
            headers = {
                'x-api-key': self.api_key
            }
            
            # 5. Clipdrop APIに送信
            logger.info("Clipdrop API呼び出し開始")
            response = requests.post(
                self.uncrop_endpoint,
                files=files,
                data=data,
                headers=headers,
                timeout=60
            )
            
            if not response.ok:
                error_msg = f"Clipdrop APIエラー: {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text}"
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            logger.info("Clipdrop API呼び出し成功")
            return response.content
            
        except Exception as e:
            logger.error(f"画像拡張エラー: {e}")
            raise ValueError(f"画像拡張に失敗しました: {e}") 