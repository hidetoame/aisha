# クレジット履歴統合移行ガイド

電話番号ログインユーザーのクレジット管理を統一クレジットシステムに移行するためのガイドです。

## 統合の概要

### 問題
- 電話番号ログインユーザーは`PhoneUser.credits`でクレジット管理
- マイガレージユーザーは統一クレジットシステム（`UserCredit`、`CreditTransaction`、`CreditCharge`）でクレジット管理
- **電話番号ログインユーザーはクレジット履歴を見ることができない**

### 解決策
電話番号ログインユーザーも統一クレジットシステムを使用するよう移行

## 実装内容

### 1. 統一クレジットサービス (`UnifiedCreditService`)
- 両ユーザータイプで共通のクレジット管理
- 後方互換性を維持（既存のPhoneUserも動作）
- 自動移行機能付き

### 2. 新しいAPIエンドポイント
- `GET /api/unified-credits/?user_id=<user_id>` - クレジット残高取得
- `GET /api/unified-credits/history/?user_id=<user_id>` - クレジット履歴取得
- `POST /api/unified-credits/consume/` - クレジット消費
- `POST /api/unified-credits/migrate/` - PhoneUserの手動移行

### 3. 既存APIの更新
- Firebase認証APIにクレジット情報を追加
- メニュー実行時のクレジット消費を統一システムに変更
- 新規ユーザー作成時に統一システムに自動追加

## 移行手順

### Step 1: DRY RUN（実際の変更なし）
```bash
python manage.py migrate_phone_user_credits --dry-run
```

### Step 2: 実際の移行実行
```bash
python manage.py migrate_phone_user_credits
```

### Step 3: 強制移行（既存のUserCreditがある場合も上書き）
```bash
python manage.py migrate_phone_user_credits --force
```

## 移行後の確認方法

### 1. データベース確認
```sql
-- PhoneUserの一覧
SELECT firebase_uid, nickname, credits FROM phone_users;

-- 統一クレジットシステムの確認
SELECT user_id, credit_balance FROM user_credits;

-- クレジット取引履歴の確認
SELECT user_id, transaction_type, amount, description, created_at 
FROM credit_transactions 
ORDER BY created_at DESC;
```

### 2. API テスト
```bash
# クレジット残高取得
curl "http://localhost:7999/api/unified-credits/?user_id=<firebase_uid>"

# クレジット履歴取得
curl "http://localhost:7999/api/unified-credits/history/?user_id=<firebase_uid>"
```

## 後方互換性

- 既存のPhoneUserのcreditsフィールドは残存（参照用）
- 統一システムに移行していないユーザーは従来通り動作
- 段階的移行が可能

## フロントエンドでの変更

### Firebase認証レスポンスにクレジット情報が追加
```typescript
interface FirebaseAuthResponse {
  success: boolean;
  id: string;
  nickname: string;
  phoneNumber: string;
  isAdmin: boolean;
  credits: number;  // 新規追加
  isNewUser: boolean;
}
```

### クレジット履歴取得API
```typescript
// 統一クレジット履歴取得
const response = await fetch(`/api/unified-credits/history/?user_id=${userId}`);
const data = await response.json();
console.log(data.history); // クレジット履歴配列
```

## 移行のメリット

1. **クレジット履歴の表示**：電話番号ユーザーもクレジット履歴が見れるように
2. **統一管理**：両ユーザータイプで同じクレジット管理システム
3. **詳細な取引記録**：チャージ、消費、返金、ボーナスの記録
4. **Stripe連携**：将来的なクレジットチャージ機能
5. **監査ログ**：すべてのクレジット操作の追跡可能

## 注意事項

- 移行は一方向のみ（統一システムからPhoneUserには戻せない）
- 移行前にバックアップを推奨
- 本番環境では段階的に実行を推奨
- 移行後はPhoneUserのcreditsフィールドは参照のみとなる