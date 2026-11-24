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
pnpm run typecheck
pnpm run lint
pnpm test             # jsdom：部品のふるまい・axe・Story の play
pnpm run test:layout  # ブラウザ：配置の基準（初回は pnpm exec playwright install chromium）
```

部品の props や説明（`/** */`）を書いたら `pnpm run llms`、`tokens.css` のトークンを変えたら `pnpm run tokens` で書き出します。書き出し忘れは `pnpm test` が止めます。

`pnpm run test:layout` が失敗したら、メッセージの「基準」に合わせて CSS を直します。メッセージには Story、配色・密度・文字の組み合わせ、部品の名前、要素、ずれの大きさが出ます。

すぐに直せない理由があるときだけ、`packages/react/src/test/layout/baseline.ts` に理由付きで例外を足します。画面の例外は `example`（Story の名前）か `element`（要素の一部）で、ずれる箇所だけに絞ります。直したら例外を消してください（消し忘れると検査が知らせます）。

## プルリクエスト

作業を始める前に、下書きの PR を開き、本文の「触るファイル」に変えるつもりのファイルを1行に1つ書きます（`.github/pull_request_template.md` に節があります）。そのあと `pnpm run check:overlap` を流すと、ほかの開いた PR の宣言と実際の変更に重なるファイルが出ます。重なったら、相手と分け方を決めるか、相手の枝に積みます。`--all` を付けると、開いた PR どうしの重なりをすべて出します。知らせるだけで、検査は落ちません。`llms.txt`・`tokens.json`・`CHANGELOG.md` は、重なっても書き出し直せば済むので、別に出します。変更履歴の断片（`changes/`）は PR ごとのファイルなので、名前が重ならなければ食い違いません。

CI（`.github/workflows/ci.yml`）が typecheck・lint・test・配置の検査・build を走らせます。

### レビュー

下書きでない PR が開いたとき、「Ready for review」にしたとき、push したときに、`.github/workflows/claude-code-review.yml` が Claude Code でレビューします。

- 経緯を知らない目で差分を読み、`/code-review high` も流し、確かめた指摘だけを PR にコメントで残します。観点は WCAG 2.x AA・キーボード操作と ARIA・props の説明と `llms.txt`・変更履歴・4px の格子などで、workflow の prompt に書いてあります。
- コードは直しません。指摘は作者が直して push します。push するとレビューが走り直し、前のレビューは止まります。
- 直す必要のある指摘がなければ、ラベル「マージ予約」を付けます（次の節）。push すると、レビューの前にラベルと自動マージをいったん外し、走り直したレビューで指摘がなければ付け直します。
- 走るのは、このリポジトリの枝からの PR だけです。フォークからの PR では走りません。
- `.github/workflows` を変える PR では、Claude のレビューは走りません（Claude の GitHub App が、既定の枝と同じ workflow でないと動かないため）。レビューの検査は通った扱いになり、理由が PR にコメントされます。手でレビューしてマージします。共通の workflow の SHA を上げる Renovate の PR だけは、検査が通れば Renovate が自動でマージします。
- PR の CI（`CI`）が落ちると、`.github/workflows/claude-fix-ci.yml` が Claude Code に直させ、直したら push します（CI とレビューが走り直します）。人が判断すべきものや、続けて2回直しても通らないものは、持ち主にメンションしてラベル「人の手が要る」を付けて止まります。直して push したら、ラベルを外してください。下書きの PR と、ボットの PR には手を出しません。
- 持ち主が Issue や PR のコメントに `@claude` と書くと、`.github/workflows/claude.yml` が Claude Code を動かします。ほかの人の `@claude` では動かず、Claude が読むのも持ち主と Claude 自身のコメントだけです。

利用する側に見える変更（`packages/*/src` の部品・スタイル、`packages/react` の `bin`・`lint`、`packages/tokens/tokens.css`）は、`changes/` に PR ごとの断片を1つ足します。ファイル名は枝の名前から `claude/` などを除いたもの（例：`changes/component-chip.md`）で、中身は CHANGELOG.md と同じ見出しの、パッケージ（`###`）と区分（`####`、見た目が変わる・振る舞いが変わる・足したもの・直したもの）と項目です。

```md
### @lievre/react

#### 足したもの

- 分類や選んだ値を示す `Chip` と `ChipGroup`。（#6）
```

書き方は [changes/README.md](changes/README.md) と CHANGELOG.md の冒頭にあります。CHANGELOG.md の「未公開」には書きません。どの PR も同じ区分の末尾に1行足すと、並行する PR がほぼ必ず食い違うからです。テストや内部の整理だけで利用する側に見えないときは、PR の説明に「変更履歴：なし（理由）」の1行を書きます。書き忘れと「未公開」に足した行は `.github/workflows/changelog.yml` が止め、落ちたときのメッセージに貼れる断片が出ます。

公開するときは `pnpm run changelog:release 0.3.0` で、断片と「未公開」の行を CHANGELOG.md の版の見出しの下にまとめ、断片を消します。package.json の版、タグ、`npm publish` は手で行います。

### マージの予約

ラベル「マージ予約」は「レビューが済み、直す必要のある指摘がない」という印です。ふつうは CI のレビューが付けます。手でレビューしたときは、終えたら手で付けます。`.github/workflows/merge-reservation.yml` が、向き先が `main` の PR に自動マージ（merge commit）を入れ、必須の検査（`check`・`changelog`）が通るとマージされます。

- 前の PR の枝に積んだ PR にも、レビューが済んだらすぐ付けてかまいません。向き先が `main` でないあいだは何もせず、前の PR がマージされて向き先が `main` に付け替わってから予約します。
- 積んだ PR に `gh pr merge --auto` を手で入れないでください。前の枝には必須の検査がないので、その場で前の枝へマージされます。
- 下書きの PR は、「Ready for review」にしてから予約します。
- ラベルを外しても、入った自動マージは残ります。取り消すときは `gh pr merge <番号> --disable-auto` も行います。
- `.github/workflows` を変える PR とフォークからの PR は、自動では予約しません（ボットがコメントで知らせます）。検査が通ったら `gh pr merge <番号> --merge` で手でマージします。
- 自動マージのコミットは CI を起こさないので、この workflow が `main` の CI を `workflow_dispatch` で走らせます。付け替わった PR は 10 分ごとの見回りで拾います。GitHub の schedule は混むと遅れるので、急ぐときは Actions の「マージ予約」を手で走らせます（Run workflow）。
- Claude の workflow（`claude.yml`・`claude-code-review.yml`・`claude-fix-ci.yml`・`merge-reservation.yml`）の中身は、ほかのリポジトリと共通の [shiroinock/workflows](https://github.com/shiroinock/workflows) にあり、ここのファイルはそれを呼ぶだけです。シークレットを渡すので、`@main` ではなく読んで確かめたコミットの SHA で呼びます。共通側の main が進むと、Renovate が4つのファイルの SHA（`merge-reservation.yml` は `workflows_ref` も）を同じ SHA に上げる PR を出します。共通側の変更は shiroinock/workflows の PR で読んでからマージします。lievre に固有のレビューの観点は、`claude-code-review.yml` の `review_focus` に書きます。
