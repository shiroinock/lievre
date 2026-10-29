# KEI（計）

業務の画面を読みやすく組み立てるための、日本語向けの React コンポーネントと CSS トークンです。設計の考え方は [DESIGN.md](DESIGN.md) にまとめています。

AI のコーディングエージェントで使うときは、まず [llms.txt](llms.txt) を読ませてください。使い方の約束と全部品の props を1つにまとめたもので、パッケージにも入っています（`node_modules/@kei-design/react/llms.txt`）。

## 起動

Node.js 22.12 以降が必要です。

```sh
npm ci
npm run storybook   # http://127.0.0.1:6006
npm run dev         # 概要のデモ http://127.0.0.1:5173
```

`.npmrc` の `legacy-peer-deps=true` は、npm が optional peer を解決するときに出る `edgesOut` エラーを避けるための設定です。

## 構成

| 場所                 | 内容                                                           |
| -------------------- | -------------------------------------------------------------- |
| `src/components`     | React コンポーネントと型                                       |
| `src/styles/kei.css` | 部品のスタイルとトークン（トークンの正）                       |
| `tokens/tokens.json` | `kei.css` から生成した交換用のトークン                         |
| `src/stories`        | 各部品の Story（Controls・Autodocs・Accessibility・play 関数） |
| `src/docs`           | 導入、設計原則、配色・文字・余白                               |
| `src/patterns`       | 画面例：探す・読む・申し込む・管理する                         |
| `references`         | 参考にした81件のピンと一覧ビューア                             |
| `llms.txt`           | エージェント向けの使い方と全部品の API（型から生成）           |
| `lint`               | 使う側のアプリ向けの lint ルール（ESLint・Oxlint・Biome）      |
| `bench/agent`        | エージェント向けのベンチマーク                                 |

## 開発

```sh
npm run typecheck
npm run lint        # stylelint の KEI 独自ルール（scripts/stylelint-kei.mjs）と、使う側向けのルール（lint/）を Story と画面例に
npm test            # 部品・画面フロー・axe・コントラスト・トークン同期
npm run test:layout # 配置の基準をブラウザで測る（docs/quality-gate.md、初回は npx playwright install chromium）
npm run tokens      # kei.css を変更したら tokens.json を書き出す
npm run llms        # 部品の props や説明を変えたら llms.txt を書き出す
npm run bench:agent # エージェント向けのベンチマーク（docs/agent-benchmark.md）
npm run format
npm run build       # lib/・dist/・dist/storybook/
```

部品を追加するときの手順は [CONTRIBUTING.md](CONTRIBUTING.md) にあります。

jsdom では色のコントラストを測れないため、トークンの組み合わせを数値で検査するテストを別に用意しています。

## 別のプロジェクトで使う

npm には公開していません。パッケージを作って取り込みます。

```sh
npm run build:lib
npm pack
```

```tsx
import { KeiProvider, ToastProvider, Button, TextField } from '@kei-design/react';
import '@kei-design/react/styles.css';

export function App() {
  return (
    <KeiProvider theme="paper" density="comfortable" typography="interface">
      <ToastProvider>
        <TextField label="ワークスペース名" defaultValue="計測ラボ" />
        <Button variant="primary">保存する</Button>
      </ToastProvider>
    </KeiProvider>
  );
}
```

- React / ReactDOM は利用する側で用意します。
- 書体（IBM Plex Sans JP / IBM Plex Mono）は同梱していません。`npm i @fontsource/ibm-plex-sans-jp @fontsource/ibm-plex-mono` で入れ、Sans の 400・500・600 を読み込んでください。等幅は英数字と日本語を 1:2 にするため、次の `'KEI Mono'` を 400・500・600 の太さごとに定義するか、PlemolJP を読み込みます。どちらもない場合、等幅の英数字は縮まず、周りより一回り大きく表示されます。

  ```css
  @font-face {
    font-family: 'KEI Mono';
    font-weight: 400;
    font-display: swap;
    size-adjust: 83.333%; /* 0.6em 幅を 0.5em 幅にする */
    src: url('@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2') format('woff2');
    unicode-range: U+0000-00FF, U+2010-2011, U+20AC, U+2122, U+2212;
  }
  ```

- スタイルは `@layer kei.*` に入っています。層に入っていない CSS は層の中より強いため、アプリのリセット（`button { background: none }` や Tailwind の preflight など）は `@layer` に入れて、KEI より先に宣言してください（例：`@layer reset, kei.tokens, kei.base, kei.components, kei.utilities;`）。
- スタイルは `.kei` の内側に限定されます。ページ全体のリセットやアプリのナビゲーションは含みません。
- `theme`（paper / ink）、`density`（comfortable / compact）、`typography`（standard / interface）はそれぞれ独立して指定できます。

## lint

型では止まらない部品の誤用を、使う側のアプリの lint で止めます。ルールは `@kei-design/react/lint` に入っていて、ほかのパッケージは要りません。ESLint と Oxlint は同じプラグイン（`lint/index.js`）をそのまま読み込み、Biome は GritQL のファイル（`lint/biome/*.grit`）を読み込みます。メッセージには直し方を日本語で書いています。

| ルール                   | 止めるもの                                                                                     | Biome |
| ------------------------ | ---------------------------------------------------------------------------------------------- | ----- |
| `button-type-in-form`    | `<form>` の中の Button・IconButton に `type` がない（既定は `type="button"` で送信しない）     | あり  |
| `metric-unit`            | Metric の `value` に単位がある（`"99.95%"`）。ESLint・Oxlint は `--fix` で `unit` に分けます   | あり  |
| `metric-change`          | Metric の `trend="up"` / `"down"` に `change` がない（矢印と色だけでは向きが読み上げられない） | あり  |
| `dialog-close`           | Dialog・ConfirmDialog・Popover に `open` だけを渡す。Dialog の `footer` の Button が何もしない | あり  |
| `confirm-dialog-trigger` | ConfirmDialog に `trigger` も `open` もない                                                    | あり  |
| `confirm-label`          | ConfirmDialog の `confirmLabel` が「OK」「はい」「実行」など                                   | あり  |
| `danger-tone`            | 「削除」などの ConfirmDialog・メニューの項目に `tone` の danger がない                         | あり  |
| `icon-button-label`      | IconButton の `label` が空か記号だけ                                                           | あり  |
| `icon-only-button`       | Button の中身がアイコンだけ（IconButton を使う）。アイコンとみなすものは下に書きました         | 一部  |
| `unit-outside-mono`      | `.k-mono` の中に単位（%・円）がある                                                            | あり  |

`@kei-design/react` から読み込んだ部品だけを見ます。部品を自分のモジュールから出し直しているときは、ESLint と Oxlint の `settings` に `"kei": { "importSources": ["@kei-design/react", "@/ui"] }` と読み込み元を足します。

`icon-only-button` がアイコンとみなすのは、アイコンの部品集（`lucide-react`・`@radix-ui/react-icons`・`@heroicons/react`・`react-icons`。`@heroicons/react/24/outline` のような副パスも含む）から読み込んだもの、名前が `Icon` で終わるもの、KEI が書き出すアイコン（名前が `Icon` で終わります）だけです。`<Button><FormattedMessage id="save" /></Button>` のように、ボタンの文字を出しているかもしれない部品は止めません。ほかの部品集を使うときは、ESLint と Oxlint の `settings` に `"kei": { "iconSources": ["my-icons"] }` と足します。

### ESLint

```js
// eslint.config.js
import tseslint from 'typescript-eslint';
import kei from '@kei-design/react/lint';

export default [
  { files: ['**/*.tsx'], languageOptions: { parser: tseslint.parser }, ...kei.configs.recommended },
];
```

`kei.configs.recommended` は全ルールを `error` にします。1つずつ選ぶときは `plugins: { kei }` と `rules: { 'kei/metric-unit': 'error' }` のように書きます。

### Oxlint

JS プラグインで同じファイルを読み込みます。Oxlint の JS プラグインは alpha です（1.89.0 で確かめています）。

```json
{
  "jsPlugins": ["@kei-design/react/lint"],
  "rules": {
    "kei/button-type-in-form": "error",
    "kei/metric-unit": "error",
    "kei/metric-change": "error",
    "kei/dialog-close": "error",
    "kei/confirm-dialog-trigger": "error",
    "kei/confirm-label": "error",
    "kei/danger-tone": "error",
    "kei/icon-button-label": "error",
    "kei/icon-only-button": "error",
    "kei/unit-outside-mono": "error"
  }
}
```

### Biome

使うルールの `.grit` を `plugins` に並べます（2.6.2 で確かめています）。

```json
{
  "plugins": [
    "./node_modules/@kei-design/react/lint/biome/button-type-in-form.grit",
    "./node_modules/@kei-design/react/lint/biome/metric-unit.grit",
    "./node_modules/@kei-design/react/lint/biome/metric-change.grit",
    "./node_modules/@kei-design/react/lint/biome/dialog-close.grit",
    "./node_modules/@kei-design/react/lint/biome/confirm-dialog-trigger.grit",
    "./node_modules/@kei-design/react/lint/biome/confirm-label.grit",
    "./node_modules/@kei-design/react/lint/biome/danger-tone.grit",
    "./node_modules/@kei-design/react/lint/biome/icon-button-label.grit",
    "./node_modules/@kei-design/react/lint/biome/icon-only-button.grit",
    "./node_modules/@kei-design/react/lint/biome/unit-outside-mono.grit"
  ]
}
```

Biome のプラグインの指摘には、ルールの名前が出ず `plugin` とだけ出ます。メッセージの文は ESLint と同じです。止めるのをやめる箇所には `// biome-ignore lint/plugin: 理由` を書きます。

#### Biome で書けないこと

どのルールも `.grit` を用意していますが、GritQL では次のことができないため、ESLint・Oxlint より見る範囲が狭くなります。

- **名前と読み込みを結べない。** `@kei-design/react` から何かを読み込んでいるファイルの中で、`Button` などの名前の要素を見ます。`import { Button as KButton }` の別名は見つけられず、同じファイルで別のライブラリの `Button` も使っていると、そちらも見ます。`settings` に当たる設定がないため、`importSources` と `iconSources` も使えません。`icon-only-button` がアイコンの部品集とみなすのは、上の決まった4つだけです。
- **「子がすべてアイコン」を書けない。** 子の並びは決まった形でしか比べられないため、`icon-only-button` は、子がアイコン1つのときと `icon` だけのときに止めます。アイコンを2つ並べたものは ESLint・Oxlint だけが止めます。
- **`metric-unit` の自動の直しはない。** GritQL の書き換えでは、値を数値と単位に分けて2つの属性にする処理を書けないため、指摘だけにしています。
- **メッセージの中で `\"` を使えない。** Biome の GritQL は文字列の `\"` を正しく読まず、後ろの文字が化けます。そのためメッセージの例は `type='submit'` のように一重引用符で書き、ESLint・Oxlint の文もそろえています。
- Biome には JavaScript のプラグインもありますが、Developer Preview で、ESLint とは別の形の API（`defineRule` と `query`）です。同じ実装を読み込めないため、今は使っていません。

### 確かめ方

`src/test/consumer-lint.test.tsx` が、ルールごとの通る例と止める例を ESLint・Oxlint・Biome の3つで流し、Oxlint の結果が ESLint とまったく同じか、Biome が同じ数を止めるかを確かめます。Biome の `.grit` のメッセージが ESLint のメッセージと同じ文かどうかも確かめます。ルールを足したら、`lint/index.js`・`lint/index.d.ts`・`lint/biome/` とこのテストに足してください。

## 使い方の約束

- 入力には必ず `label` を付け、ダイアログには説明を付けます。
- 状態は色だけでなく、文字でも伝えます。
- 数値・時刻・ID・コードには `.k-mono`、文中の数値には `.k-tabular` を使います。
- ページ付きの DataTable では、全件を先に並べ替えてから区切ります（`sorting` / `onSortingChange`）。
- フォーカスリングは消さず、動きを減らす設定に従います。
