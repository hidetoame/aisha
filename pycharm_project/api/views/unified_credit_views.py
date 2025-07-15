import json
import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from ..services.unified_credit_service import UnifiedCreditService

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_credits(request):
    """
    ユーザーのクレジット残高を取得
    """
    try:
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({
                'success': False,
                'message': 'user_idが必要です'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        credit_balance = UnifiedCreditService.get_user_credits(user_id)
        
        return Response({
            'success': True,
            'credits': credit_balance
        })
        
    except Exception as e:
        logger.error(f"クレジット残高取得エラー: {str(e)}")
        return Response({
            'success': False,
            'message': 'クレジット残高の取得に失敗しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_credit_history(request):
    """
    ユーザーのクレジット履歴を取得
    """
    try:
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({
                'success': False,
                'message': 'user_idが必要です'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        limit = int(request.query_params.get('limit', 50))
        history = UnifiedCreditService.get_credit_history(user_id, limit)
        
        return Response({
            'success': True,
            'history': history
        })
        
    except Exception as e:
        logger.error(f"クレジット履歴取得エラー: {str(e)}")
        return Response({
            'success': False,
            'message': 'クレジット履歴の取得に失敗しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def consume_credits(request):
    """
    クレジットを消費
    """
    try:
        data = json.loads(request.body)
        user_id = data.get('user_id')
        amount = data.get('amount')
        description = data.get('description', '')
        
        if not user_id or not amount:
            return Response({
                'success': False,
                'message': 'user_idとamountが必要です'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        success, message = UnifiedCreditService.consume_credits(user_id, amount, description)
        
        if success:
            return Response({
                'success': True,
                'message': message
            })
        else:
            return Response({
                'success': False,
                'message': message
            }, status=status.HTTP_400_BAD_REQUEST)
        
    except json.JSONDecodeError:
        return Response({
            'success': False,
            'message': '無効なリクエストです'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"クレジット消費エラー: {str(e)}")
        return Response({
            'success': False,
            'message': 'クレジット消費に失敗しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def migrate_phone_user(request):
    """
    PhoneUserを統一クレジットシステムに移行
    """
    try:
        data = json.loads(request.body)
        firebase_uid = data.get('firebase_uid')
        
        if not firebase_uid:
            return Response({
                'success': False,
                'message': 'firebase_uidが必要です'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        success, message = UnifiedCreditService.migrate_phone_user_to_unified(firebase_uid)
        
        if success:
            return Response({
                'success': True,
                'message': message
            })
        else:
            return Response({
                'success': False,
                'message': message
            }, status=status.HTTP_400_BAD_REQUEST)
        
    except json.JSONDecodeError:
        return Response({
            'success': False,
            'message': '無効なリクエストです'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"PhoneUser移行エラー: {str(e)}")
        return Response({
            'success': False,
            'message': 'PhoneUserの移行に失敗しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)