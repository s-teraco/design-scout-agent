# Moodboard Generator - ムードボード生成

プロジェクト用のビジュアルムードボードを生成します。

## 使い方

```
/moodboard [プロジェクトタイプ] [スタイル]
```

- `$ARGUMENTS` - プロジェクトタイプとスタイル指定

---

## タスク実行フロー

### Step 1: 要件確認

ユーザーに以下を確認：
- プロジェクトのカテゴリ（Web/Mobile/Dashboard等）
- 希望するスタイル（Minimalist/Dark/Gradient等）
- ターゲットオーディエンス
- ブランドカラー（あれば）

### Step 2: デザイン収集

Design Scout Agentを使用して関連デザインを収集：

```typescript
const agent = new DesignScoutAgent();
await agent.scout({
  categories: [targetCategory],
  styles: [preferredStyles],
  limit: 30
});
```

### Step 3: ムードボード生成

収集したデザインから以下を含むムードボードを作成：

1. **ビジュアルリファレンス** (8-12点)
   - 各画像の関連性説明
   - 採用すべき要素

2. **カラーパレット**
   - プライマリ・セカンダリ・アクセントカラー
   - 背景・テキストカラー

3. **タイポグラフィ提案**
   - 見出しフォント
   - 本文フォント
   - サイズスケール

4. **レイアウトガイド**
   - グリッドシステム
   - スペーシング規則

### Step 4: 出力

HTML形式のインタラクティブなムードボードを `./output/moodboards/` に生成。

## 出力例

```
Generated: output/moodboards/moodboard-landing-page-1234567890.html

ムードボード概要:
- 収集デザイン数: 30
- 採用スタイル: Minimalist, Gradient
- カラー: #3B82F6 (Primary), #8B5CF6 (Accent)
- 推奨フォント: Inter, Space Grotesk
```

## オプション

| オプション | 説明 | 例 |
|------------|------|-----|
| --style | スタイル指定 | `--style=minimalist` |
| --colors | ブランドカラー | `--colors=#FF0000,#00FF00` |
| --platform | プラットフォーム | `--platform=ios` |
