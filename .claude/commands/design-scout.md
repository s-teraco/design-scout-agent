# Design Scout - デザイン収集・提案エージェント

最新のデザイントレンドをWeb検索で収集し、プロジェクトに合わせたデザイン提案を行います。

## 引数
- `$ARGUMENTS` - カテゴリとオプション（例: "landing-page" や "fintech dashboard"）

---

## 実行手順

### Step 1: 検索クエリの生成

引数を解析し、以下のカテゴリから適切な検索クエリを生成:

| カテゴリ | 検索キーワード |
|---------|---------------|
| web | web application UI design |
| mobile-ios | iOS mobile app UI |
| dashboard | dashboard admin panel analytics |
| landing-page | landing page website |
| e-commerce | e-commerce online store |
| saas | SaaS platform B2B |
| fintech | fintech banking finance app |

### Step 2: Web検索の実行

WebSearchツールを使用して以下のソースから検索:

**検索クエリ例:**
```
best [カテゴリ] design 2025 inspiration
site:dribbble.com [カテゴリ] UI design
site:awwwards.com [カテゴリ] website
site:behance.net [カテゴリ] UI UX
site:mobbin.com [カテゴリ] app
```

**優先ソース:**
1. Dribbble (`dribbble.com`) - プロフェッショナルデザイン
2. Awwwards (`awwwards.com`) - 受賞サイト
3. Behance (`behance.net`) - クリエイティブ作品
4. Mobbin (`mobbin.com`) - モバイルUIパターン

### Step 3: 結果の収集と整理

各検索結果から以下を抽出:
- **タイトル**: デザイン/プロジェクト名
- **URL**: リンク
- **説明**: 概要
- **ソース**: プラットフォーム名
- **スタイル**: minimalist, dark-mode, glassmorphism, bento, gradient, 3d など

**最低20件のデザインリファレンスを収集すること。**

### Step 4: 分析と提案

収集したデザインを分析:

1. **トレンド特定**
   - 頻出するスタイル（minimalist, dark-mode, bento等）
   - 共通するレイアウトパターン
   - 人気のインタラクション

2. **カラーパレット提案**
   - Primary: メインカラー
   - Secondary: サブカラー
   - Accent: アクセントカラー
   - Background/Surface: 背景色

3. **レイアウト推奨**
   - グリッドシステム
   - スペーシング
   - コンポーネント配置

### Step 5: 出力

以下の形式で結果をまとめる:

```markdown
## デザイン提案: [カテゴリ]

### 収集したリファレンス (Top 10)
1. [タイトル](URL)
   - ソース: Dribbble
   - スタイル: minimalist, dark-mode
   - 特徴: ...

### トレンド分析
- **ドミナントスタイル**: minimalist (60%), dark-mode (45%), bento (30%)
- **レイアウト傾向**: カードベース、ベントグリッド
- **インタラクション**: スムーズアニメーション、ホバーエフェクト

### 推奨カラーパレット
| 役割 | カラー | 用途 |
|------|--------|------|
| Primary | #6366F1 | ボタン、リンク |
| Secondary | #8B5CF6 | アクセント要素 |
| Background | #F9FAFB | 背景 |
| Text | #111827 | 本文 |

### 実装コード

#### CSS変数
\`\`\`css
:root {
  --color-primary: #6366F1;
  --color-secondary: #8B5CF6;
  --color-background: #F9FAFB;
  --color-text: #111827;
}
\`\`\`

#### Tailwind設定
\`\`\`javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#6366F1',
        secondary: '#8B5CF6',
      }
    }
  }
}
\`\`\`
```

---

## カテゴリオプション

| カテゴリ | 説明 |
|---------|------|
| `web` | Webアプリケーション |
| `mobile-ios` | iOSアプリ |
| `mobile-android` | Androidアプリ |
| `dashboard` | ダッシュボード |
| `landing-page` | ランディングページ |
| `e-commerce` | ECサイト |
| `saas` | SaaSプラットフォーム |
| `fintech` | 金融サービス |
| `healthcare` | ヘルスケア |

## スタイルオプション

| スタイル | 説明 |
|---------|------|
| `minimalist` | ミニマルデザイン |
| `dark-mode` | ダークテーマ |
| `glassmorphism` | ガラス効果 |
| `bento` | ベントグリッド |
| `gradient` | グラデーション |
| `3d` | 3D要素 |
| `illustration` | イラスト |
| `typography` | タイポグラフィ重視 |

## 使用例

```
/design-scout landing-page
/design-scout fintech dashboard dark-mode
/design-scout mobile-ios glassmorphism
/design-scout e-commerce bento
```
