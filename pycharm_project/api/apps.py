from django.apps import AppConfig
import logging
import os

logger = logging.getLogger(__name__)

# グローバル変数でFirebase初期化状態を管理
_firebase_initialized = False

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
    
    def ready(self):
        """アプリケーション起動時に実行される"""
        global _firebase_initialized
        
        # 重複実行を防ぐ（Django autoreload対策）
        if _firebase_initialized:
            print("=== Firebase は既に初期化済みです（重複実行回避） ===")
            logger.info("Firebase は既に初期化済みです（重複実行回避）")
            return
        
        # RUN_MAIN環境変数チェック（Django autoreload の main プロセスのみで実行）
        if os.environ.get('RUN_MAIN', None) != 'true':
            print("=== Django autoreload：サブプロセスのため Firebase 初期化をスキップ ===")
            return
        
        # Firebase初期化の実行
        try:
            from .views.firebase_auth import initialize_firebase
            print("=== Firebase初期化処理を開始 ===")
            logger.info("Firebase初期化処理を開始")
            initialize_firebase()
            print("=== Firebase初期化処理が完了 ===")
            logger.info("Firebase初期化処理が完了")
            _firebase_initialized = True  # フラグを設定
        except Exception as e:
            print(f"=== Firebase初期化処理でエラー: {str(e)} ===")
            logger.error(f"Firebase初期化処理でエラー: {str(e)}")
            # エラーが発生してもサーバーは起動させる
            pass
