#!/usr/bin/env python3
import psycopg2
import os
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/')
def db_test():
    try:
        # DB接続
        conn = psycopg2.connect(
            host="34.85.116.154",
            port="5432",
            database="postgres",
            user="postgres",
            password="postgres"
        )
        
        # テストクエリ実行
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        db_version = cursor.fetchone()
        
        cursor.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
        table_count = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'status': 'success',
            'message': 'DB接続成功',
            'database_version': db_version[0] if db_version else 'Unknown',
            'table_count': table_count[0] if table_count else 0
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'DB接続エラー: {str(e)}',
            'error_type': type(e).__name__
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080) 