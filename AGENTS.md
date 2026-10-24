# エージェント向けの作業メモ

KEI（計）のリポジトリで作業する AI エージェント向けです。利用する側の使い方は [llms.txt](llms.txt) にあります。

## 場所

- 部品：`src/components`（`index.ts` から export）。スタイルとトークンの正：`src/styles/kei.css`。
- Story：`src/stories`。テスト：`src/test`。設計：`DESIGN.md`。
- 独自の lint：`scripts/stylelint-kei.mjs`（CSS）、`eslint.config.mjs`（TSX）。ルールごとのテストは `src/test/lint.test.tsx`。

## 確かめる

```sh
npm run typecheck && npm run lint && npm test
```

- `kei.css` を変えたら `npm run tokens`、部品の props や説明（`/** */`）を変えたら `npm run llms`。どちらも書き出し忘れは `npm test` が止めます。
- `npm run build` は lib・デモ・Storybook まで作ります。

## 約束

- 文書・コミット・PR・ラベルは日本語。英大文字の飾りラベルは使わない。
- レビューで見つかった誤りは、できるだけ lint やテストで次から止める。ルールのメッセージには直し方を書く。
- 部品の props には `/** */` で説明を付ける。説明はそのまま `llms.txt` とエディタの補完に出る。
