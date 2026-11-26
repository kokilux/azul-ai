# Azul AI

Azul ボードゲームの Web 実装（React + TypeScript + Vite）です。人間対戦、AI対戦、特殊ルール、自己対戦による強化学習を備えています。

## セットアップ

```bash
npm install
npm run dev
```

## スクリプト

| コマンド | 説明 |
| --- | --- |
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run typecheck` | TypeScript 型チェック (`tsc --noEmit`) |
| `npm run test` | Vitest によるユニットテスト |
| `npm run bench:ai` | AI難易度/バリアントのベンチマーク（`--suite smoke` / `--suite full`） |
| `npm run pretrain:ai` | AI 事前学習（長時間、デフォルトは league モード） |

## プロジェクト構成

- `src/types/game.ts` - ゲーム状態・型定義
- `src/utils/gameEngine.ts` - ルール実装（ドラフト、配置、得点、終了判定）
- `src/utils/aiEngine.ts` - AI（Easy/Normal/Hard）、特徴量評価、探索、自己対戦学習
- `src/components/` - UI コンポーネント
- `scripts/pretrain.ts` - 事前学習スクリプト
- `scripts/benchAi.ts` - AI ベンチマーク

## ルール/バリアント

- 標準 Azul ルール（2-4人、5/7/9皿）
- グレイウォール: 壁の色固定を解除し、同色の行/列重複を禁止して自由配置
- 特殊工場: Type 1-5 の特殊皿効果

実装上の明記:
- グレイウォールの自動配置は、合法手の中で隣接/列重みを考慮したヒューリスティックで選択します。
- special_4 は残りタイルを色グループ単位で左右に交互振り分けします（色グループ数が奇数の場合、左右で枚数差が出ることがあります）。
- special_5 シールドは床ライン上のペナルティ1回分を無効化するマーカーとして扱います。

## AI

- **初級 (easy)**: ランダム（床以外優先）
- **中級 (normal)**: ヒューリスティック評価による貪欲選択
- **最強 (hard)**: 117次元特徴量 + 自己対戦学習重み + 反復深化 Minimax/Alpha-Beta + 置換表

学習重みはブラウザ `localStorage` に保存され、JSON でエクスポート/インポートできます。Node 実行時は `localStorage` がないため永続化は無効化され、事前学習重み/初期重みで動作します。自己対戦学習は league/curriculum（self/baseline/greedy、通常/グレイウォール/特殊工場）をサポートします。

## 開発メモ

- 生成物 `.tmp-pretrain/`, `.tmp-bench/` は `.gitignore` 対象です。
- ルール変更時は `src/utils/gameEngine.test.ts` と `src/utils/aiEngine.test.ts` を更新してください。
