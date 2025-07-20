import logging
from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([AllowAny])
def inspect_database_tables(request):
    """
    本番データベースのテーブル一覧とMyGarageユーザー関連テーブルの確認
    セキュリティ: 本番環境でのみ実行可能
    """
    try:
        # デバッグモードでは実行を拒否（セキュリティ対策）
        if settings.DEBUG:
            return Response({
                'success': False,
                'message': 'データベース確認エンドポイントは本番環境でのみ利用可能です'
            }, status=status.HTTP_403_FORBIDDEN)
        
        with connection.cursor() as cursor:
            # テーブル一覧を取得
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name LIKE '%mygarage%' OR table_name LIKE '%user%'
                ORDER BY table_name;
            """)
            
            user_tables = [row[0] for row in cursor.fetchall()]
            
            # ユーザー200120を全テーブルで検索
            search_results = {}
            
            # 各テーブルで200120を検索
            for table in user_tables:
                if 'pg_' in table or 'auth_user_' in table:
                    continue  # システムテーブルをスキップ
                
                try:
                    # テーブルのカラム一覧を取得
                    cursor.execute(f"""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = '{table}' AND table_schema = 'public'
                    """)
                    columns = [row[0] for row in cursor.fetchall()]
                    
                    # 200120を含むレコードを検索
                    search_conditions = []
                    for col in columns:
                        search_conditions.append(f"{col}::text LIKE '%200120%'")
                    
                    if search_conditions:
                        search_query = f"""
                            SELECT * FROM {table} 
                            WHERE {' OR '.join(search_conditions)}
                            LIMIT 3
                        """
                        cursor.execute(search_query)
                        results = cursor.fetchall()
                        
                        if results:
                            search_results[table] = {
                                'columns': columns,
                                'records': [list(row) for row in results],
                                'record_count': len(results)
                            }
                except Exception as e:
                    search_results[table] = {'error': str(e)}
            
            # MyGarageユーザー関連テーブルの詳細確認
            mygarage_data = {}
            

            
            # user_profiles テーブルの確認（実際のテーブル名）
            if 'user_profiles' in user_tables:
                cursor.execute("SELECT COUNT(*) FROM user_profiles;")
                profile_count = cursor.fetchone()[0]
                
                cursor.execute("SELECT * FROM user_profiles LIMIT 5;")
                profiles = cursor.fetchall()
                
                # カラム名を取得
                cursor.execute("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = 'user_profiles' AND table_schema = 'public'
                    ORDER BY ordinal_position
                """)
                columns = [row[0] for row in cursor.fetchall()]
                
                mygarage_data['user_profiles'] = {
                    'count': profile_count,
                    'columns': columns,
                    'sample_data': [list(row) for row in profiles]
                }
            
            # user_credits テーブルの確認（実際のテーブル名）
            if 'user_credits' in user_tables:
                cursor.execute("SELECT COUNT(*) FROM user_credits;")
                credit_count = cursor.fetchone()[0]
                
                cursor.execute("SELECT * FROM user_credits LIMIT 5;")
                credits = cursor.fetchall()
                
                # カラム名を取得
                cursor.execute("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = 'user_credits' AND table_schema = 'public'
                    ORDER BY ordinal_position
                """)
                columns = [row[0] for row in cursor.fetchall()]
                
                mygarage_data['user_credits'] = {
                    'count': credit_count,
                    'columns': columns,
                    'sample_data': [list(row) for row in credits]
                }
            
            # api_userprofile テーブルの確認
            if 'api_userprofile' in user_tables:
                cursor.execute("SELECT COUNT(*) FROM api_userprofile;")
                profile_count = cursor.fetchone()[0]
                
                cursor.execute("SELECT frontend_user_id, nickname, is_admin FROM api_userprofile LIMIT 5;")
                profiles = cursor.fetchall()
                
                mygarage_data['api_userprofile'] = {
                    'count': profile_count,
                    'sample_data': [
                        {
                            'frontend_user_id': row[0],
                            'nickname': row[1],
                            'is_admin': row[2]
                        } for row in profiles
                    ]
                }
            
            # api_usercredit テーブルの確認
            if 'api_usercredit' in user_tables:
                cursor.execute("SELECT COUNT(*) FROM api_usercredit;")
                credit_count = cursor.fetchone()[0]
                
                cursor.execute("SELECT user_id, credits FROM api_usercredit LIMIT 5;")
                credits = cursor.fetchall()
                
                mygarage_data['api_usercredit'] = {
                    'count': credit_count,
                    'sample_data': [
                        {
                            'user_id': row[0],
                            'credits': row[1]
                        } for row in credits
                    ]
                }
            
            return Response({
                'success': True,
                'user_related_tables': user_tables,
                'search_user_200120': search_results,
                'mygarage_data': mygarage_data
            }, status=status.HTTP_200_OK)
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Database inspection failed: {error_msg}")
        
        return Response({
            'success': False,
            'message': f'データベース確認失敗: {error_msg}',
            'error': error_msg
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)