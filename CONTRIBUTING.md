# 部品の追加

新しい部品は、次の手順で追加します。配置の基準は [docs/quality-gate.md](docs/quality-gate.md) にあります。

## 1. 部品と Story

1. `packages/react/src/components` に部品を書き、`packages/react/src/index.ts` から公開します。クラス名は `.lv-` で始めます。
2. スタイルは `packages/react/src/styles/lievre.css` の `@layer lievre.components` に書きます。高さ・余白・間隔はトークン（`--lv-space-*`、`--lv-control-height`）か 4px の倍数にします。トークンそのものは `packages/tokens/tokens.css` にあります。
3. `packages/react/src/stories/部品名.stories.tsx` を作り、`meta.component` に部品を指定します。状態ごとに Story を分けます。開いた状態（ダイアログ・メニュー・ツールチップ）も、開いたまま終わる Story を1つ作ります。

## 2. 配置の宣言

meta の `parameters.layoutGate` に、測る部品と検査を書きます。

```tsx
import type { LayoutGate } from '../test/layout/declare';

const meta = {
  title: 'Components/Actions/Button',
  component: Button,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: 'ボタン', // 失敗のメッセージに出る名前
          selector: '.lv-button', // .lv- で始める。ポータルの中も探す
          checks: [
            'inset-x',
            'inset-y',
            'control-height',
            { padding: 'button' },
            'fits',
            { icon: 'svg' },
          ],
        },
      ],
    } satisfies LayoutGate,
  },
} satisfies Meta<typeof Button>;
```

部品の種類ごとの目安：

| 部品                               | checks                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| ボタン・タブ                       | `inset-x` `inset-y` `control-height` `{ padding: 'button' }` `fits` `{ icon }` |
| アイコンだけのボタン               | `inset-x` `inset-y` `control-height` `square` `focus-room`                     |
| 入力欄・選択の欄                   | `inset-y` `control-height` `{ padding: 'input' }`                              |
| バッジ・キー・アバター             | `inset-x` `inset-y` `grid-height`                                              |
| チェックボックス・ラジオ・スイッチ | 欄に `{ icon: '箱の selector', text: 'ラベルの selector' }`                    |
| パネル（Card・Alert・Toast）       | `padding-equal`                                                                |
| 並べて使う部品                     | 並べた Story を作り、親に `{ sameHeight: '…' }`                                |
| 図（svg）                          | `fills-x`                                                                      |
| ラベルと値の行                     | `{ baseline: ':scope > *' }` `line-grid`                                       |
| 数値の読み値（等幅と単位が並ぶ行） | `line-grid`                                                                    |

部品を測らない Story ファイルは、`layoutGate: { skip: '理由' }` と書きます。部品を組み合わせた画面の Story は、`{ screen: '理由', parts: SCREEN_PARTS }` で、画面に出てくる部品をまとめて測ります。

行高や文字間隔をわざと上書きする点検用の Story（WCAG 1.4.12 の文字間隔など）は、その Story の `parameters.layoutStress` に理由を書きます。行の箱の格子・高さの格子・操作の高さ・上下の中央は上書きで外れるのが当然なので見ず、はみ出しや並びの崩れだけを見ます。meta に書くとファイルのすべての Story で検査が外れるため、meta には書けません（テストが止めます）。

## 3. テスト

コマンドはリポジトリの直下で実行します。

```sh
npm run typecheck
npm run lint
npm test             # jsdom：部品のふるまい・axe・Story の play
npm run test:layout  # ブラウザ：配置の基準（初回は npx playwright install chromium）
```

部品の props や説明（`/** */`）を書いたら `npm run llms`、`tokens.css` のトークンを変えたら `npm run tokens` で書き出します。書き出し忘れは `npm test` が止めます。

`npm run test:layout` が失敗したら、メッセージの「基準」に合わせて CSS を直します。メッセージには Story、配色・密度・文字の組み合わせ、部品の名前、要素、ずれの大きさが出ます。

すぐに直せない理由があるときだけ、`packages/react/src/test/layout/baseline.ts` に理由付きで例外を足します。画面の例外は `example`（Story の名前）か `element`（要素の一部）で、ずれる箇所だけに絞ります。直したら例外を消してください（消し忘れると検査が知らせます）。

## プルリクエスト

CI（`.github/workflows/ci.yml`）が typecheck・lint・test・配置の検査・build を走らせます。すべて通ってからレビューを頼んでください。

利用する側に見える変更（`packages/*/src` の部品・スタイル、`packages/react` の `bin`・`lint`、`packages/tokens/tokens.css`）は、[CHANGELOG.md](CHANGELOG.md) の「未公開」の、パッケージと区分（見た目が変わる・振る舞いが変わる・足したもの・直したもの）の下に1行足します。書き方は CHANGELOG.md の冒頭にあります。テストや内部の整理だけで利用する側に見えないときは、PR の説明に「変更履歴：なし（理由）」の1行を書きます。書き忘れは `.github/workflows/changelog.yml` が止めます。

### マージの予約

レビューを終えたら、PR にラベル「マージ予約」を付けます。`.github/workflows/merge-reservation.yml` が、向き先が `main` の PR に自動マージ（merge commit）を入れ、必須の検査（`check`・`changelog`）が通るとマージされます。

- 前の PR の枝に積んだ PR にも、レビューが済んだらすぐ付けてかまいません。向き先が `main` でないあいだは何もせず、前の PR がマージされて向き先が `main` に付け替わってから予約します。
- 積んだ PR に `gh pr merge --auto` を手で入れないでください。前の枝には必須の検査がないので、その場で前の枝へマージされます。
- 下書きの PR は、「Ready for review」にしてから予約します。
- ラベルを外しても、入った自動マージは残ります。取り消すときは `gh pr merge <番号> --disable-auto` も行います。
- `.github/workflows` を変える PR とフォークからの PR は、自動では予約しません（ボットがコメントで知らせます）。検査が通ったら `gh pr merge <番号> --merge` で手でマージします。
- 自動マージのコミットは CI を起こさないので、この workflow が `main` の CI を `workflow_dispatch` で走らせます。付け替わった PR は 10 分ごとの見回りで拾います。GitHub の schedule は混むと遅れるので、急ぐときは Actions の「マージ予約」を手で走らせます（Run workflow）。
