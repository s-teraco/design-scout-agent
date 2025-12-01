# Design Scout Agent

最新のUI/UXデザイントレンドを収集し、プロジェクト向けのデザイン提案を生成するAIエージェントシステム。

## 概要

Design Scout Agentは以下の機能を提供します：

- **デザイン収集** - Dribbble, Awwwards, Mobbin, Behance, Figma, Pinterest等から最新UIデザインを収集
- **カラー抽出** - 画像から自動でカラーパレットを抽出・分析
- **トレンド分析** - スタイル、カラー、レイアウトの傾向を分析
- **提案生成** - インタラクティブムードボード、デザインレポート、コードスニペットを生成
- **データ永続化** - 収集したデザインをローカルに保存・検索
- **定期実行** - GitHub Actionsで自動収集

---

## インストール

```bash
cd design-scout-agent
npm install
npm run build
```

グローバルインストール:
```bash
npm link
```

---

## 対応デザインソース

| ソース | 説明 | 状態 |
|--------|------|------|
| Dribbble | デザインコミュニティ | ✅ |
| Awwwards | 受賞Webサイト | ✅ |
| Mobbin | モバイルUIパターン | ✅ |
| Behance | Adobe系デザイナー作品 | ✅ |
| Figma | Figma Community | ✅ |
| Pinterest | ビジュアルインスピレーション | ✅ |
| ProductHunt | 新プロダクトUI | ✅ |

---

## 使い方

### 方法1: CLIコマンド

```bash
# デザイン収集（ストアに保存）
design-scout scout --sources dribbble,behance --category web --save

# トレンド分析
design-scout analyze

# 提案生成（インタラクティブムードボード付き）
design-scout propose --category dashboard --platform web

# フルパイプライン
design-scout run --category landing-page --query "fintech"

# 統計表示
design-scout stats

# 収集履歴
design-scout history
```

### 方法2: Claude Codeのスラッシュコマンド

```
# デザイン収集・提案
/design-scout landing-page

# トレンドレポート
/design-trends mobile-ios

# ムードボード生成
/moodboard e-commerce minimalist
```

### 方法3: Claude Codeでの対話

```
「fintechダッシュボードのデザイン提案をして」
「最新のモバイルアプリUIトレンドを調べて」
「ECサイト用のムードボードを作成して」
```

### 方法4: TypeScript/JavaScript API

```typescript
import { DesignScoutAgent } from 'design-scout-agent';

const agent = new DesignScoutAgent();

// デザイン収集（ストアに保存）
await agent.scout({
  sources: ['dribbble', 'behance', 'figma'],
  categories: ['landing-page', 'dashboard'],
  styles: ['minimalist', 'dark-mode'],
  limit: 30,
  saveToStore: true,
});

// トレンド分析
const { analysis, trends } = await agent.analyze();

// 提案生成
const { proposal, outputs } = await agent.propose({
  targetCategory: 'landing-page',
  targetPlatform: 'web',
  generateOutputs: true,
});

// ストアから検索
const results = await agent.searchStored({
  query: 'dashboard',
  styles: ['minimalist'],
  favoritesOnly: false,
});

// 統計取得
const stats = await agent.getStats();
```

---

## インタラクティブムードボード

生成されるHTMLムードボードは以下の機能を持ちます：

| 機能 | 説明 |
|------|------|
| ドラッグ&ドロップ | カードを自由に並び替え |
| ダークモード | ワンクリックで切り替え |
| 検索・フィルター | タイトル検索、ソース別フィルター |
| お気に入り | ❤️でマーク、フィルター表示 |
| コメント | 各カードにメモ追加 |
| 画像ズーム | ダブルクリックで拡大 |
| エクスポート | PNG/PDF出力 |
| 共有 | URLコピー |
| 状態保持 | LocalStorageで設定維持 |

---

## データ永続化

収集したデザインはローカルに保存され、検索・管理できます。

```bash
# 保存先
data/designs.json

# 機能
- デザイン保存・検索
- お気に入り管理
- コレクション作成
- トレンドキャッシュ
- 収集履歴
```

### ストレージAPI

```typescript
// お気に入り切り替え
await agent.toggleFavorite(designId);

// コレクション作成
await agent.createCollection('My Collection', 'Description');

// コレクションに追加
await agent.addToCollection(collectionId, designId);

// 統計取得
const stats = await agent.getStats();
// => { totalDesigns, totalFavorites, designsBySource, ... }
```

---

## GitHub Actions定期実行

毎日自動でデザインを収集できます。

### 設定

```yaml
# .github/workflows/scheduled-collection.yml
on:
  schedule:
    - cron: '0 0 * * *'  # 毎日9:00 JST
  workflow_dispatch:     # 手動実行も可能
```

### 手動実行

1. GitHub → Actions → "Scheduled Design Collection"
2. "Run workflow" をクリック
3. カテゴリを選択して実行

### 結果

- `data/` に収集データ保存
- `output/` にムードボード等生成
- Artifactとして30日間保持

---

## 出力ファイル

### ムードボード (HTML)
`output/moodboards/moodboard-[category]-[timestamp].html`

インタラクティブなビジュアルリファレンス集：
- カラーパレット（クリックでコピー）
- 参照画像ギャラリー
- トレンドカード
- ドラッグ&ドロップ対応

### デザインレポート (Markdown)
`output/reports/design-report-[category]-[timestamp].md`

詳細な分析と推奨事項：
- カラーパレット仕様
- タイポグラフィ推奨
- レイアウトガイド
- トレンド分析

### コードスニペット (CSS/Tailwind)
`output/snippets/snippets-[category]-[timestamp].css`
`output/snippets/snippets-[category]-[timestamp].tailwind.js`

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
| `typography-focused` | タイポグラフィ重視 |
| `organic` | オーガニック、自然な曲線 |
| `geometric` | 幾何学模様、シャープな形状 |
| `brutalist` | ブルータリスト、大胆なデザイン |

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

## プロジェクト構成

```
design-scout-agent/
├── src/
│   ├── agents/          # メインエージェント
│   ├── collectors/      # ソース別コレクター
│   ├── analyzers/       # 分析・カラー抽出
│   ├── generators/      # 出力生成
│   ├── storage/         # データ永続化
│   └── types/           # 型定義
├── .github/workflows/   # GitHub Actions
├── data/                # 収集データ保存
└── output/              # 生成ファイル
```

---

## トラブルシューティング

### デザインが収集されない

外部サイトへの直接アクセスが制限されている場合があります。
Claude Codeの`WebSearch`/`WebFetch`ツールを使用した収集を推奨します。

### ビルドエラー

```bash
rm -rf node_modules
npm install
npm run build
```

### GitHub Actionsが動かない

- リポジトリの Settings → Actions → General で有効化
- `workflow_dispatch` で手動実行をテスト

---

## ライセンス

MIT License

---

## 連絡先

問題や提案がある場合は、[Issue](https://github.com/s-teraco/design-scout-agent/issues)を作成してください。
