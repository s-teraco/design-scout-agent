# Design Scout Skill

## Description
デザイントレンドの収集、分析、提案を行うスキル。Web、モバイル、ダッシュボードなど様々なプラットフォーム向けのデザインインスピレーションを提供します。

## Capabilities

### 1. デザイン収集 (Scout)
複数のデザインプラットフォームから最新のUIデザインを収集します。

**ソース:**
- Dribbble - プロフェッショナルデザイナーの作品
- Awwwards - 受賞Webサイト
- Mobbin - モバイルアプリUIパターン
- Behance - クリエイティブプロジェクト
- App Store / Play Store - 実際のアプリUI

**収集データ:**
- デザイン画像
- スタイル分類（Minimalist, Glassmorphism, Bento等）
- カラー情報
- デザイナー/制作者情報
- エンゲージメント（いいね数、閲覧数）

### 2. トレンド分析 (Analyze)
収集したデザインを分析し、トレンドを特定します。

**分析項目:**
- ドミナントスタイル
- カラーパターン
- レイアウト傾向
- タイポグラフィ傾向
- インタラクションパターン

**スコアリング:**
- モダン度スコア (0-100)
- ユニーク度スコア (0-100)
- アクセシビリティスコア (0-100)

### 3. デザイン提案 (Propose)
分析結果に基づいた具体的なデザイン提案を生成します。

**出力物:**
- **ムードボード** - HTML形式のビジュアルリファレンス
- **デザインレポート** - Markdown形式の詳細分析
- **コードスニペット** - CSS/Tailwind実装コード

## Usage Examples

### 基本的な使用

```typescript
import { DesignScoutAgent } from 'design-scout-agent';

const agent = new DesignScoutAgent();

// デザイン収集
await agent.scout({
  categories: ['landing-page'],
  limit: 30
});

// トレンド分析
const { analysis, trends } = await agent.analyze();

// 提案生成
const { proposal, outputs } = await agent.propose({
  targetCategory: 'landing-page',
  targetPlatform: 'web'
});
```

### CLI使用

```bash
# デザイン収集
npm run scout -- --categories=landing-page --limit=30

# フルパイプライン実行
npm run run -- --category=dashboard --platform=web --query="fintech"
```

## Integration with Claude Code

このスキルはClaude Codeの以下のエージェントタイプと連携できます：

- **ui-designer** - UI設計時のリファレンス提供
- **frontend-developer** - 実装用コードスニペット生成
- **rapid-prototyper** - プロトタイプのデザイン方向性決定

## Output Formats

### Moodboard HTML
```html
<!-- インタラクティブなムードボード -->
<!-- カラーパレット表示 -->
<!-- 参照画像ギャラリー -->
<!-- トレンドカード -->
```

### Design Report Markdown
```markdown
# デザイン提案レポート
## カラーパレット
## タイポグラフィ
## レイアウト推奨
## トレンド分析
```

### Code Snippets
```css
/* CSS変数定義 */
/* コンポーネントスタイル */
/* ユーティリティクラス */
```

## Categories

| カテゴリ | 説明 |
|---------|------|
| web | Webアプリケーション全般 |
| mobile-ios | iOSアプリ |
| mobile-android | Androidアプリ |
| dashboard | 管理画面・ダッシュボード |
| landing-page | ランディングページ |
| e-commerce | ECサイト |
| saas | SaaSプラットフォーム |
| portfolio | ポートフォリオサイト |
| fintech | 金融サービス |
| healthcare | ヘルスケア |

## Styles

| スタイル | 説明 |
|---------|------|
| minimalist | ミニマルデザイン |
| glassmorphism | 透明感・ブラー効果 |
| neumorphism | ソフトUI |
| bento | ベントグリッド |
| dark-mode | ダークモード |
| gradient | グラデーション |
| 3d | 3D・没入型 |
| illustration | イラスト中心 |
