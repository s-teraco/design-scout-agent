# Design Scout Agent System

Claude Codeと統合するためのカスタムエージェント・サブエージェント定義。

## エージェント一覧

### 1. design-scout (メインエージェント)

デザイントレンドの収集、分析、提案を行うメインエージェント。

**用途:**
- 最新UIデザインの収集
- デザイントレンドの分析
- プロジェクト向けデザイン提案

**使用例:**
```
/design-scout landing-page
/design-scout mobile-ios search:fintech
```

**Claude Code Task tool定義:**
```typescript
{
  "subagent_type": "design-scout",
  "description": "Use this agent to collect design inspiration, analyze UI trends, and generate design proposals. Specializes in gathering references from Dribbble, Awwwards, Mobbin and other design platforms.",
  "tools": ["WebFetch", "WebSearch", "Read", "Write", "Bash"]
}
```

### 2. moodboard-creator (サブエージェント)

ビジュアルムードボードを生成するサブエージェント。

**用途:**
- HTMLムードボード生成
- カラーパレット提案
- タイポグラフィ推奨

**使用例:**
```
/moodboard e-commerce minimalist
```

### 3. design-system-generator (サブエージェント)

デザインシステムコードを生成するサブエージェント。

**用途:**
- CSS変数定義
- Tailwind設定
- コンポーネントスタイル

---

## Claude Codeでの使用方法

### 方法1: スラッシュコマンド

```
/design-scout [category] [options]
/design-trends [category]
/moodboard [type] [style]
```

### 方法2: Task toolでの呼び出し

```json
{
  "description": "Collect fintech design inspiration",
  "prompt": "Search for fintech dashboard designs and create a design proposal",
  "subagent_type": "design-scout"
}
```

### 方法3: 直接CLI実行

```bash
cd design-scout-agent
npm run scout -- --categories=dashboard --query=fintech
npm run propose -- --category=dashboard --platform=web
```

---

## 他エージェントとの連携

### ui-designer との連携

```
1. ui-designer がUIデザインを計画
2. design-scout で参照デザインを収集
3. ui-designer が参照を基に詳細設計
```

### frontend-developer との連携

```
1. design-scout でデザイン提案を生成
2. コードスニペットを frontend-developer に渡す
3. frontend-developer が実装
```

### rapid-prototyper との連携

```
1. rapid-prototyper が新プロジェクト開始
2. design-scout でデザイン方向性を決定
3. rapid-prototyper がプロトタイプ作成
```

---

## 設定ファイル

### .claude/settings.json

エージェント定義とコマンド設定を含む。

### skills/design-scout.md

スキルの詳細ドキュメント。

### .claude/commands/*.md

各スラッシュコマンドの定義。

---

## インストール

```bash
cd design-scout-agent
npm install
npm run build
```

## 依存関係

- Node.js 18+
- TypeScript 5+
- cheerio (HTMLパース)
- axios (HTTPリクエスト)
- commander (CLI)
