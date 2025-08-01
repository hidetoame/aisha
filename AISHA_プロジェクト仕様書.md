# AISHA プロジェクト仕様書

## 1. プロジェクト概要

### 1.1 プロジェクト名
**AISHA (AI-Powered Car Image Generation & E-commerce Platform)**

### 1.2 プロジェクトの目的
AISHAは、AI技術を活用して自動車のカスタマイズ画像を生成し、生成した画像を使用してオリジナル商品を作成・販売できるSaaSプラットフォームです。

### 1.3 主要機能
- AI画像生成（複数のAIエンジン対応）
- カスタマイズ商品作成（SUZURI連携）
- クレジットベースの課金システム
- ソーシャル機能（タイムライン、コメント、いいね）
- 管理者機能

## 2. システムアーキテクチャ

### 2.1 技術スタック

#### フロントエンド
- **フレームワーク**: React 19.1.0 + TypeScript
- **ビルドツール**: Vite 5.4.10
- **スタイリング**: Tailwind CSS 3.4.1
- **状態管理**: React Context API
- **HTTP通信**: Axios 1.10.0
- **決済**: Stripe React SDK 2.8.0
- **AI**: Google Generative AI SDK 0.24.1

#### バックエンド
- **フレームワーク**: Django 5.2.3 + Django REST Framework 3.16.0
- **言語**: Python 3.11
- **データベース**: PostgreSQL
- **ファイルストレージ**: Google Cloud Storage
- **決済処理**: Stripe Python SDK 11.5.0
- **SMS認証**: AWS SNS (boto3)

#### インフラストラクチャ
- **ホスティング**: Google Cloud Platform (Cloud Run)
- **データベース**: Cloud SQL (PostgreSQL)
- **ストレージ**: Google Cloud Storage
- **コンテナ**: Docker
- **CI/CD**: Google Cloud Build

### 2.2 システム構成図

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React SPA     │────▶│  Django API     │────▶│  PostgreSQL     │
│  (Cloud Run)    │     │  (Cloud Run)    │     │  (Cloud SQL)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │                         
        │                        ▼                         
        │               ┌─────────────────┐               
        └──────────────▶│      GCS        │               
                        │  (画像ストレージ) │               
                        └─────────────────┘               
```

## 3. 機能仕様

### 3.1 ユーザー認証システム

#### 3.1.1 デュアル認証
1. **MyGarage認証**
   - 外部サービス連携
   - 初回ログイン時100クレジット付与
   - UserProfileモデル使用

2. **電話番号認証**
   - SMS検証（6桁コード）
   - 30日間有効なトークン発行
   - 初回登録時30クレジット付与
   - PhoneUserモデル使用

#### 3.1.2 認可システム
- 管理者フラグ（is_admin）による権限管理
- APIエンドポイント別アクセス制御

### 3.2 AI画像生成機能

#### 3.2.1 対応AIエンジン
- Black Forest Labs
- Ideogram
- Imagen3
- Midjourney

#### 3.2.2 生成プロセス
1. カテゴリー選択
2. メニュー（プロンプトテンプレート）選択
3. 画像アップロード（オプション）
4. パラメータ設定（アスペクト比、追加プロンプト）
5. クレジット消費して生成
6. 結果の保存・共有

### 3.3 クレジットシステム

#### 3.3.1 クレジット管理
- 統一クレジットサービス（UnifiedCreditService）
- 購入、消費、履歴管理
- トランザクション記録

#### 3.3.2 料金プラン
- ChargeOptionモデルで管理
- 価格、付与クレジット、ボーナス設定
- Stripe決済連携

### 3.4 商品作成機能（E-commerce）

#### 3.4.1 SUZURI連携
- 商品種類選択
- デザイン配置
- 価格設定（原価＋利益率）
- 商品URL生成

#### 3.4.2 商品管理
- GoodsManagementモデル
- 複数サプライヤー対応（SUZURI、Printful、Spreadshirt）
- 在庫・販売管理

### 3.5 ソーシャル機能

#### 3.5.1 タイムライン
- 公開画像の共有
- フィルタリング・検索
- ページネーション

#### 3.5.2 インタラクション
- コメント機能
- いいね機能
- シェア機能

### 3.6 管理者機能

#### 3.6.1 ユーザー管理
- ユーザー一覧・検索
- クレジット付与・削除
- 管理者権限設定

#### 3.6.2 コンテンツ管理
- カテゴリー・メニュー管理
- 生成履歴統計
- 売上管理

## 4. データベース設計

### 4.1 主要テーブル

#### ユーザー関連
- **UserProfile**: Django User拡張
- **PhoneUser**: 電話番号認証ユーザー
- **PhoneVerificationSession**: SMS検証セッション
- **PhoneLoginToken**: ログイントークン

#### コンテンツ関連
- **Category**: カテゴリーマスタ
- **Menu**: AIプロンプトテンプレート
- **PromptVariable**: 動的パラメータ
- **Library**: 生成画像データ
- **Comment**: コメント
- **Like**: いいね

#### 決済関連
- **ChargeOption**: 料金プラン
- **CreditCharge**: 購入記録
- **UserCredit**: クレジット残高
- **CreditTransaction**: 取引履歴
- **PaymentLog**: Stripe決済ログ

#### 商品関連
- **GoodsManagement**: 商品マスタ
- **SuzuriMerchandise**: SUZURI商品データ
- **CarSettings**: 車両設定

### 4.2 データベース関係図

```
UserProfile ─────┐
                 ├──→ Library ←──┬─── Comment
PhoneUser ───────┘               └─── Like
                                 │
                                 └──→ SuzuriMerchandise
                                 
Category ──→ Menu ──→ PromptVariable

ChargeOption ──→ CreditCharge ──→ CreditTransaction
                                        ↑
                                   UserCredit
```

## 5. API仕様

### 5.1 主要エンドポイント

#### 認証
- `POST /api/mygarage-auth/register/` - MyGarage認証
- `POST /api/phone-login/send-sms/` - SMS送信
- `POST /api/phone-login/verify/` - SMS検証
- `POST /api/phone-login/validate/` - トークン検証

#### 画像生成
- `GET /api/categories/` - カテゴリー一覧
- `GET /api/menus/` - メニュー一覧
- `POST /api/menus/{id}/execute/` - 画像生成実行
- `POST /api/images/upload/` - 画像アップロード

#### クレジット
- `GET /api/unified-credits/` - 残高確認
- `POST /api/unified-credits/consume/` - クレジット消費
- `GET /api/charge-options/` - 料金プラン一覧
- `POST /api/charges/` - 購入処理

#### タイムライン
- `GET /api/timeline/public/` - 公開タイムライン
- `POST /api/timeline/` - 画像投稿
- `POST /api/timeline/{id}/comments/` - コメント投稿
- `POST /api/timeline/{id}/like/` - いいね

#### 商品
- `POST /api/suzuri/merchandise/` - 商品作成
- `GET /api/suzuri/products/` - 商品一覧
- `GET /api/goods/public/` - 公開商品一覧

#### 管理者
- `GET /api/admin/users/` - ユーザー一覧
- `POST /api/admin/credits/add/` - クレジット付与
- `GET /api/admin/generation-history/stats/` - 統計情報

### 5.2 API認証方式
- **MyGarageユーザー**: セッションベース認証
- **電話番号ユーザー**: Bearerトークン認証
- **管理者API**: 追加の権限チェック

## 6. セキュリティ仕様

### 6.1 認証・認可
- Bearer Token認証
- セッション管理（有効期限設定）
- 管理者権限チェック

### 6.2 通信セキュリティ
- HTTPS通信必須
- CORS設定（ホワイトリスト方式）
- CSRFトークン保護

### 6.3 データ保護
- パスワードハッシュ化
- 環境変数による機密情報管理
- SQLインジェクション対策

### 6.4 監査・監視
- アクセスログ記録
- データベース操作監査
- 異常検知アラート

### 6.5 セキュリティヘッダー（本番環境）
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- Secure Cookie設定

## 7. デプロイメント仕様

### 7.1 環境構成
- **開発環境**: Docker Compose
- **本番環境**: Google Cloud Run

### 7.2 リソース設定
- **CPU**: 1 vCPU
- **メモリ**: 512Mi
- **最大インスタンス数**: 10
- **タイムアウト**: 300秒

### 7.3 環境変数
- DATABASE_URL
- DJANGO_SECRET_KEY
- STRIPE_SECRET_KEY
- AWS認証情報
- GCS認証情報

### 7.4 デプロイメントフロー
1. Google Cloud Buildでコンテナビルド
2. Container Registryにプッシュ
3. Cloud Runにデプロイ
4. ヘルスチェック確認

## 8. 運用・保守

### 8.1 バックアップ
- データベース定期バックアップ
- 画像ファイルGCSバックアップ

### 8.2 監視項目
- サーバーヘルスチェック
- API応答時間
- エラー率
- リソース使用率

### 8.3 スケーリング
- Cloud Run自動スケーリング
- Cloud SQL接続プーリング

### 8.4 ログ管理
- Cloud Logging統合
- エラーログ監視
- アクセスログ分析

## 9. 外部サービス連携

### 9.1 決済サービス
- **Stripe**
  - 決済処理
  - Webhook連携
  - 定期課金対応

### 9.2 AI画像生成
- **Google Generative AI**
- **Ideogram API**
- **Black Forest Labs API**
- **ClipDrop API**

### 9.3 Eコマース
- **SUZURI API**
  - 商品作成
  - 在庫管理
  - 売上追跡

### 9.4 認証・通信
- **AWS SNS** - SMS送信
- **MyGarage API** - 外部認証

## 10. 今後の拡張計画

### 10.1 機能拡張
- 新AIエンジン追加
- 多言語対応
- モバイルアプリ開発

### 10.2 連携拡張
- 追加ECプラットフォーム連携
- SNS自動投稿機能
- アナリティクス強化

### 10.3 パフォーマンス改善
- CDN導入
- 画像最適化
- キャッシュ戦略強化

## 11. 開発・テスト環境

### 11.1 開発環境セットアップ
1. リポジトリクローン
2. Docker Composeで環境構築
3. 環境変数設定（.env.dev）
4. データベースマイグレーション
5. 開発サーバー起動

### 11.2 テスト戦略
- ユニットテスト（Django TestCase）
- APIテスト（REST Framework）
- 統合テスト
- 負荷テスト

## 12. ドキュメント

### 12.1 技術ドキュメント
- API仕様書
- データベース設計書
- デプロイメント手順書

### 12.2 運用ドキュメント
- 運用手順書
- 障害対応マニュアル
- バックアップ・リストア手順

### 12.3 ユーザードキュメント
- 利用ガイド
- FAQ
- トラブルシューティング