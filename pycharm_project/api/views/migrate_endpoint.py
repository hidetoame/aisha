import logging
from django.http import JsonResponse
from django.core.management import call_command
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import io
import sys

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def run_migrations(request):
    """
    一度だけ実行する本番環境のマイグレーション
    セキュリティ: 本番環境でのみ実行可能
    """
    try:
        # デバッグモードでは実行を拒否（セキュリティ対策）
        if settings.DEBUG:
            return Response({
                'success': False,
                'message': 'マイグレーションエンドポイントは本番環境でのみ利用可能です'
            }, status=status.HTTP_403_FORBIDDEN)
        # Capture migration output
        old_stdout = sys.stdout
        sys.stdout = captured_output = io.StringIO()
        
        logger.info("Starting database migrations...")
        
        # Run migrations
        call_command('migrate', verbosity=2)
        
        # Get output
        migration_output = captured_output.getvalue()
        sys.stdout = old_stdout
        
        logger.info(f"Migration completed successfully: {migration_output}")
        
        return Response({
            'success': True,
            'message': 'Database migrations completed successfully',
            'output': migration_output
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        sys.stdout = old_stdout
        error_msg = str(e)
        logger.error(f"Migration failed: {error_msg}")
        
        return Response({
            'success': False,
            'message': f'Migration failed: {error_msg}',
            'error': error_msg
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def migration_status(request):
    """
    マイグレーション状況を確認
    セキュリティ: 本番環境でのみ実行可能
    """
    try:
        # デバッグモードでは実行を拒否（セキュリティ対策）
        if settings.DEBUG:
            return Response({
                'success': False,
                'message': 'マイグレーションエンドポイントは本番環境でのみ利用可能です'
            }, status=status.HTTP_403_FORBIDDEN)
        # Capture showmigrations output
        old_stdout = sys.stdout
        sys.stdout = captured_output = io.StringIO()
        
        call_command('showmigrations', verbosity=2)
        
        # Get output
        migration_status_output = captured_output.getvalue()
        sys.stdout = old_stdout
        
        return Response({
            'success': True,
            'status': migration_status_output
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        sys.stdout = old_stdout
        error_msg = str(e)
        logger.error(f"Migration status check failed: {error_msg}")
        
        return Response({
            'success': False,
            'message': f'Migration status check failed: {error_msg}',
            'error': error_msg
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)