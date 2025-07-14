from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404

from ..models.user_profile import UserProfile
from ..services.user_service import UserService
from ..serializers.user_profile import (
    UserProfileSerializer, 
    UserWithProfileSerializer, 
    AdminStatusSerializer
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request, frontend_user_id):
    """フロントエンドユーザーIDでユーザープロフィールを取得"""
    profile = UserService.get_user_profile_by_frontend_id(frontend_user_id)
    
    if not profile:
        return Response(
            {'error': 'User profile not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = UserProfileSerializer(profile)
    return Response(serializer.data)


@api_view(['GET'])
def check_admin_status(request, frontend_user_id):
    """フロントエンドユーザーIDから管理者ステータスを確認"""
    is_admin = UserService.is_admin_by_frontend_id(frontend_user_id)
    
    return Response({
        'frontend_user_id': frontend_user_id,
        'is_admin': is_admin
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_admin_status(request, frontend_user_id):
    """フロントエンドユーザーIDから管理者ステータスを設定"""
    serializer = AdminStatusSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            {'error': 'Invalid data', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    is_admin = serializer.validated_data['is_admin']
    success = UserService.set_admin_by_frontend_id(frontend_user_id, is_admin)
    
    if success:
        return Response({
            'message': 'Admin status updated successfully',
            'frontend_user_id': frontend_user_id,
            'is_admin': is_admin
        })
    else:
        return Response(
            {'error': 'User not found or update failed'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_admin_users(request):
    """すべての管理者ユーザーを取得"""
    admin_users = UserService.get_all_admin_users()
    serializer = UserWithProfileSerializer(admin_users, many=True)
    
    return Response({
        'count': admin_users.count(),
        'admin_users': serializer.data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def link_frontend_user(request, user_id):
    """既存のDjangoユーザーにフロントエンドユーザーIDを関連付け"""
    try:
        user = get_object_or_404(User, id=user_id)
        frontend_user_id = request.data.get('frontend_user_id')
        
        if not frontend_user_id:
            return Response(
                {'error': 'frontend_user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 既に使用されているフロントエンドユーザーIDかチェック
        existing_profile = UserService.get_user_profile_by_frontend_id(frontend_user_id)
        if existing_profile and existing_profile.user != user:
            return Response(
                {'error': 'frontend_user_id is already linked to another user'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        success = UserService.link_frontend_user_id(user, frontend_user_id)
        
        if success:
            return Response({
                'message': 'Frontend user ID linked successfully',
                'user_id': user_id,
                'frontend_user_id': frontend_user_id
            })
        else:
            return Response(
                {'error': 'Failed to link frontend user ID'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Exception as e:
        return Response(
            {'error': f'An error occurred: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )