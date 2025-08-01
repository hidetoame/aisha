#!/bin/bash
# DROP DATABASEが実行されたらアラートを送る設定

echo "🚨 DROP DATABASEアラートを設定します..."

# ログベースのメトリクスを作成
gcloud logging metrics create drop_database_attempts \
  --description="DROP DATABASE commands executed" \
  --log-filter='resource.type="cloudsql_database"
    resource.labels.database_id="aisha-462412:aisha-db"
    textPayload:"DROP DATABASE"' \
  --project=aisha-462412

# アラートポリシーを作成
cat > alert-policy.yaml << EOF
displayName: "DROP DATABASE Alert"
conditions:
  - displayName: "DROP DATABASE executed"
    conditionThreshold:
      filter: |
        resource.type = "cloudsql_database"
        metric.type = "logging.googleapis.com/user/drop_database_attempts"
      comparison: COMPARISON_GT
      thresholdValue: 0
      duration: 0s
notificationChannels: []  # メール通知を設定する場合はここに追加
alertStrategy:
  autoClose: 1800s
EOF

echo "✅ アラート設定を作成しました"