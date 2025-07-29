from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from api.models.category import Category


@api_view(['GET'])
def db_connection_test(request):
    """
    データベース接続テスト用のエンドポイント
    カテゴリテーブルの内容を表示
    """
    try:
        # データベース接続テスト
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            db_version = cursor.fetchone()
        
        # カテゴリテーブルの内容を取得
        categories = Category.objects.all()
        category_data = []
        
        for category in categories:
            category_data.append({
                'id': category.id,
                'name': category.name,
                'description': category.description,
                'order_index': category.order_index
            })
        
        return Response({
            'status': 'success',
            'message': 'データベース接続成功',
            'database_version': db_version[0] if db_version else 'Unknown',
            'categories_count': len(category_data),
            'categories': category_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'status': 'error',
            'message': f'データベース接続エラー: {str(e)}',
            'error_type': type(e).__name__
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 