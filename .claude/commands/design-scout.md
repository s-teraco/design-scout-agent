# Design Scout - デザイン収集・提案エージェント

最新のデザイントレンドを収集し、プロジェクトに合わせたデザイン提案を行います。

## 使い方

以下の引数を指定してください：
- `$ARGUMENTS` - カテゴリとオプション（例: "landing-page web" や "mobile-ios search:fintech"）

---

## タスク実行

1. **引数の解析**: `$ARGUMENTS` を解析してカテゴリとオプションを取得
2. **デザイン収集**: Dribbble、Awwwards、Mobbinから最新デザインを収集
3. **トレンド分析**: 収集したデザインのスタイル、カラー、レイアウトを分析
4. **提案生成**: ムードボード、カラーパレット、コードスニペットを含む提案を作成

## 実行コマンド

```bash
cd /Users/saorin/Desktop/ai/CloudCode/design-scout-agent && npm run scout -- $ARGUMENTS
```

## 出力

- **ムードボード**: HTML形式の視覚的リファレンス集
- **デザインレポート**: Markdown形式のトレンド分析と推奨事項
- **コードスニペット**: CSS/Tailwindの実装コード

## カテゴリオプション

- `web` - Webアプリケーション
- `mobile-ios` - iOSアプリ
- `mobile-android` - Androidアプリ
- `dashboard` - ダッシュボード
- `landing-page` - ランディングページ
- `e-commerce` - ECサイト
- `saas` - SaaSプラットフォーム

## 使用例

```
/design-scout landing-page
/design-scout mobile-ios search:fintech
/design-scout dashboard --limit=50
```
