# 部品の追加

新しい部品は、次の手順で追加します。配置の基準は [docs/quality-gate.md](docs/quality-gate.md) にあります。

## 1. 部品と Story

1. `src/components` に部品を書き、`src/index.ts` から公開します。クラス名は `.k-` で始めます。
2. スタイルは `src/styles/kei.css` の `@layer kei.components` に書きます。高さ・余白・間隔はトークン（`--k-space-*`、`--k-control-height`）か 4px の倍数にします。
3. `src/stories/部品名.stories.tsx` を作り、`meta.component` に部品を指定します。状態ごとに Story を分けます。開いた状態（ダイアログ・メニュー・ツールチップ）も、開いたまま終わる Story を1つ作ります。

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
          selector: '.k-button', // .k- で始める。ポータルの中も探す
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
| 入力欄・選択の欄                   | `inset-y` `control-height` `{ padding: 'input' }`                              |
| バッジ・キー・アバター             | `inset-x` `inset-y` `grid-height`                                              |
| チェックボックス・ラジオ・スイッチ | 欄に `{ icon: '箱の selector', text: 'ラベルの selector' }`                    |
| パネル（Card・Alert・Toast）       | `padding-equal`                                                                |
| 並べて使う部品                     | 並べた Story を作り、親に `{ sameHeight: '…' }`                                |
| 図（svg）                          | `fills-x`                                                                      |
| ラベルと値の行                     | `{ baseline: ':scope > *' }`                                                   |

部品を測らない Story ファイルは、`layoutGate: { skip: '理由' }` と書きます。部品を組み合わせた画面の Story は、`{ screen: '理由', parts: SCREEN_PARTS }` で、画面に出てくる部品をまとめて測ります。

## 3. テスト

```sh
npm run typecheck
npm run lint
npm test             # jsdom：部品のふるまい・axe・Story の play
npm run test:layout  # ブラウザ：配置の基準（初回は npx playwright install chromium）
```

`npm run test:layout` が失敗したら、メッセージの「基準」に合わせて CSS を直します。メッセージには Story、配色・密度・文字の組み合わせ、部品の名前、要素、ずれの大きさが出ます。

すぐに直せない理由があるときだけ、`src/test/layout/baseline.ts` に理由付きで例外を足します。直したら例外を消してください（消し忘れると検査が知らせます）。

## プルリクエスト

CI（`.github/workflows/ci.yml`）が typecheck・lint・test・配置の検査・build を走らせます。すべて通ってからレビューを頼んでください。
