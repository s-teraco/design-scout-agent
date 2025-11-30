# Design Scout Agent

最新のUI/UXデザイントレンドを収集し、プロジェクト向けのデザイン提案を生成するAIエージェントシステム。

## 概要

Design Scout Agentは以下の機能を提供します：

- **デザイン収集** - Dribbble, Awwwards, Mobbin等から最新UIデザインを収集
- **トレンド分析** - スタイル、カラー、レイアウトの傾向を分析
- **提案生成** - ムードボード、デザインレポート、コードスニペットを生成

---

## インストール

```bash
cd design-scout-agent
npm install
npm run build
```

---

## 使い方

### 方法1: Claude Codeのスラッシュコマンド

最も簡単な方法は、Claude Code内でスラッシュコマンドを使用することです。

```
# デザイン収集・提案
/design-scout landing-page

# トレンドレポート
/design-trends mobile-ios

# ムードボード生成
/moodboard e-commerce minimalist
```

### 方法2: Claude Codeでの対話

Claude Codeに直接依頼することもできます：

```
「fintechダッシュボードのデザイン提案をして」

「最新のモバイルアプリUIトレンドを調べて」

「ECサイト用のムードボードを作成して」
```

### 方法3: CLIコマンド

ターミナルから直接実行：

```bash
# デザイン収集
npm run scout -- --categories=landing-page --limit=30

# トレンド分析
npm run analyze

# 提案生成
npm run propose -- --category=dashboard --platform=web

# フルパイプライン（収集→分析→提案）
npm run run -- --category=landing-page --query="fintech"
```

### 方法4: TypeScript/JavaScript API

プログラムから使用：

```typescript
import { DesignScoutAgent } from 'design-scout-agent';

const agent = new DesignScoutAgent();

// デザイン収集
await agent.scout({
  categories: ['landing-page', 'dashboard'],
  styles: ['minimalist', 'dark-mode'],
  limit: 30
});

// トレンド分析
const { analysis, trends } = await agent.analyze();

// 提案生成
const { proposal, outputs } = await agent.propose({
  targetCategory: 'landing-page',
  targetPlatform: 'web',
  generateOutputs: true
});

console.log('Moodboard:', outputs.moodboardPath);
console.log('Report:', outputs.reportPath);
```

---

## 出力ファイル

### ムードボード (HTML)
`output/moodboards/moodboard-[category]-[timestamp].html`

インタラクティブなビジュアルリファレンス集：
- カラーパレット表示
- 参照画像ギャラリー
- トレンドカード
- 採用すべき要素リスト

### デザインレポート (Markdown)
`output/reports/design-report-[category]-[timestamp].md`

詳細な分析と推奨事項：
- カラーパレット仕様
- タイポグラフィ推奨
- レイアウトガイド
- トレンド分析
- 実装ノート

### コードスニペット (CSS/Tailwind)
`output/snippets/snippets-[category]-[timestamp].css`
`output/snippets/snippets-[category]-[timestamp].tailwind.js`

すぐに使える実装コード：
- CSS変数定義
- Tailwind設定
- コンポーネントスタイル

---

## カテゴリオプション

| カテゴリ | 説明 | 用途例 |
|---------|------|--------|
| `web` | Webアプリ全般 | SPA、管理画面 |
| `mobile-ios` | iOSアプリ | iPhone/iPad向けアプリ |
| `mobile-android` | Androidアプリ | Androidデバイス向け |
| `dashboard` | ダッシュボード | 管理画面、分析ツール |
| `landing-page` | ランディングページ | 製品紹介、LP |
| `e-commerce` | ECサイト | オンラインショップ |
| `saas` | SaaSプラットフォーム | B2Bサービス |
| `portfolio` | ポートフォリオ | 個人/企業紹介 |
| `fintech` | 金融サービス | 銀行、投資アプリ |
| `healthcare` | ヘルスケア | 医療、健康管理 |
| `education` | 教育 | 学習プラットフォーム |

---

## スタイルオプション

| スタイル | 説明 |
|---------|------|
| `minimalist` | ミニマルデザイン、余白重視 |
| `glassmorphism` | ガラス風の透明感、ブラー効果 |
| `neumorphism` | ソフトUI、立体感のある要素 |
| `bento` | ベントグリッド、カードレイアウト |
| `dark-mode` | ダークモード、暗い配色 |
| `gradient` | グラデーション、鮮やかな色彩 |
| `3d` | 3D要素、没入型体験 |
| `illustration` | カスタムイラスト、手描き風 |
| `typography-focused` | タイポグラフィ重視、文字デザイン |
| `organic` | オーガニック、自然な曲線 |
| `geometric` | 幾何学模様、シャープな形状 |

---

## Claude Code統合

### エージェント定義

`.claude/settings.json`に以下のエージェントが定義されています：

- **design-scout** - メインの収集・提案エージェント
- **moodboard-creator** - ムードボード生成専用
- **design-system-generator** - コード生成専用

### 他エージェントとの連携

```
ui-designer → design-scout → frontend-developer
     ↓              ↓               ↓
   設計計画    デザイン参照     実装コード
```

### Task toolでの呼び出し

```json
{
  "subagent_type": "design-scout",
  "prompt": "fintechダッシュボードのデザイン提案を作成",
  "description": "Fintech dashboard design proposal"
}
```

---

## 設定ファイル

| ファイル | 用途 |
|---------|------|
| `.claude/settings.json` | Claude Code統合設定 |
| `.claude/commands/*.md` | スラッシュコマンド定義 |
| `skills/design-scout.md` | スキル詳細ドキュメント |

---

## 出力例

### カラーパレット
```css
:root {
  --color-primary: #3B82F6;
  --color-secondary: #8B5CF6;
  --color-accent: #14B8A6;
  --color-background: #F9FAFB;
  --color-surface: #FFFFFF;
  --color-text: #111827;
}
```

### Tailwind設定
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#8B5CF6',
        accent: '#14B8A6',
      },
      fontFamily: {
        heading: ['Inter', 'sans-serif'],
        body: ['Open Sans', 'sans-serif'],
      },
    },
  },
}
```

---

## トラブルシューティング

### デザインが収集されない

外部サイトへの直接アクセスが制限されている場合があります。
Claude Codeの`WebSearch`/`WebFetch`ツールを使用した収集を推奨します。

### ビルドエラー

```bash
# node_modulesを削除して再インストール
rm -rf node_modules
npm install
npm run build
```

---

## ライセンス

MIT License

---

## 連絡先

問題や提案がある場合は、Issueを作成してください。
