from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Create read-only database user for safety'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # 読み取り専用ユーザーを作成
            cursor.execute("""
                -- 読み取り専用ユーザーを作成
                CREATE USER readonly_user WITH PASSWORD 'readonly_password_change_me';
                
                -- 既存のデータベースへの接続権限
                GRANT CONNECT ON DATABASE postgres TO readonly_user;
                
                -- スキーマへのアクセス権限
                GRANT USAGE ON SCHEMA public TO readonly_user;
                
                -- 全テーブルの読み取り権限のみ
                GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
                
                -- 将来作成されるテーブルにも自動的に読み取り権限を付与
                ALTER DEFAULT PRIVILEGES IN SCHEMA public 
                GRANT SELECT ON TABLES TO readonly_user;
                
                -- DROP権限は一切与えない
            """)
            
            self.stdout.write(self.style.SUCCESS('Read-only user created successfully'))
            self.stdout.write(self.style.WARNING('Please change the password immediately!'))