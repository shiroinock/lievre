# エージェント向けの作業メモ

KEI（計）のリポジトリで作業する AI エージェント向けです。利用する側の使い方は [llms.txt](packages/react/llms.txt) にあります。

## 場所

npm のワークスペースです。パッケージは `packages/` に3つあります。

- `packages/tokens`（`@kei-design/tokens`）：トークンの正 `tokens.css` と、そこから書き出す `tokens.json`。
- `packages/react`（`@kei-design/react`）：部品は `src/components`（`src/index.ts` から export）、スタイルは `src/styles/kei.css`。Story は `src/stories`、テストは `src/test`。
- `packages/tui`（`@kei-design/tui`）：端末の部品。色と字の組を決める `src/core` と、Ink で描く `src/ink`。
- 独自の lint：`packages/react/scripts/stylelint-kei.mjs`（CSS）、`packages/react/eslint.config.mjs`（TSX）。ルールごとのテストは `packages/react/src/test/lint.test.tsx`。
- 設計：`DESIGN.md`（リポジトリの直下。`npm pack` のときに `packages/react` へ写します）。

## 確かめる

```sh
npm run typecheck && npm run lint && npm test
```

- コマンドはリポジトリの直下で実行します。各パッケージに流れます（1つだけなら `-w packages/react` のように付けます）。
- `tokens.css` を変えたら `npm run tokens`、部品の props や説明（`/** */`）を変えたら `npm run llms`。どちらも書き出し忘れは `npm test` が止めます。
- `npm run build` は react の lib・デモ・Storybook と、tui の lib まで作ります。`npm run check:pack -w packages/react` で `npm pack` の中身を確かめます。

## 約束

- 文書・コミット・PR・ラベルは日本語。英大文字の飾りラベルは使わない。
- レビューで見つかった誤りは、できるだけ lint やテストで次から止める。ルールのメッセージには直し方を書く。
- 部品の props には `/** */` で説明を付ける。説明はそのまま `llms.txt` とエディタの補完に出る。
