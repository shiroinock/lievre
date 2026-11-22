# Lièvre

日本語の画面を読みやすく組み立てるための、React コンポーネントと CSS トークンです。作者個人の実験的なデザインシステムで、特定の用途に絞らず、質感や経年のような表現も試しています。どの試みでも、WCAG 2.x AA などの Web 標準の基準は守ります。設計の考え方は DESIGN.md にまとめています（パッケージに同梱。リポジトリでは直下の [DESIGN.md](../../DESIGN.md)）。開発の手順は、リポジトリの [README](../../README.md) にあります。

改名の前の名前から移るときは [MIGRATION.md](../../MIGRATION.md) の手順に沿ってください（`npx lievre-migrate` で書き換えられます）。

AI のコーディングエージェントで使うときは、まず [llms.txt](llms.txt) を読ませてください。使い方の約束と全部品の props を1つにまとめたもので、パッケージにも入っています（`node_modules/@lievre/react/llms.txt`）。

## 別のプロジェクトで使う

npm には公開していません。リポジトリの直下でパッケージを作って取り込みます。

```sh
npm ci
npm run build:lib -w packages/react
npm pack -w packages/react
```

```tsx
import { LievreProvider, ToastProvider, Button, TextField } from '@lievre/react';
import '@lievre/react/styles.css';

export function App() {
  return (
    <LievreProvider theme="paper" density="comfortable" typography="interface">
      <ToastProvider>
        <TextField label="ワークスペース名" defaultValue="計測ラボ" />
        <Button variant="primary">保存する</Button>
      </ToastProvider>
    </LievreProvider>
  );
}
```

- React / ReactDOM は利用する側で用意します。
- 書体のファイル（IBM Plex Sans JP / IBM Plex Mono）は同梱していません。fontsource から入れ、lievre の `@font-face` を読み込みます。

  ```sh
  npm i @fontsource/ibm-plex-sans-jp @fontsource/ibm-plex-mono
  ```

  ```tsx
  import '@lievre/react/fonts.css';
  import '@lievre/react/styles.css';
  ```

  `fonts.css` は `'Lievre Sans'`（Plex Sans JP の字を 0.07em 下げて行の中央に置いたもの）と `'Lievre Mono'`（Plex Mono を 5/6 に縮め、英数字と日本語を 1:2 にしたもの）を、400・500・600 の太さで定義します。ファイルは `url('@fontsource/…')` で指すので、バンドラ（Vite・webpack など）が解決します。`--lv-font-sans` は `'Lievre Sans'` → `'IBM Plex Sans JP'` の順で探すので、fontsource の CSS をそのまま読み込んでも表示はできますが、字が行の中央より上に寄ります。`fonts.css` を読み込まず PlemolJP を入れた場合、等幅はそちらを使います。

- スタイルは `@layer lievre.*` に入っています。層に入っていない CSS は層の中より強いため、アプリのリセット（`button { background: none }` や Tailwind の preflight など）は `@layer` に入れて、lievre より先に宣言してください（例：`@layer reset, lievre.tokens, lievre.base, lievre.components, lievre.utilities;`）。
- スタイルは `.lievre` の内側に限定されます。ページ全体のリセットやアプリのナビゲーションは含みません。
- `theme`（paper / ink）、`density`（comfortable / compact）、`typography`（standard / interface）、`family`（sans / mono）はそれぞれ独立して指定できます。`family="mono"` は画面全体を日本語ごと等幅にします。範囲だけなら `Text`・`Card` の `mono` か、クラス `lv-family-mono` で囲みます。

## lint

型では止まらない部品の誤用を、使う側のアプリの lint で止めます。ルールは `@lievre/react/lint` に入っていて、ほかのパッケージは要りません。ESLint と Oxlint は同じプラグイン（`lint/index.js`）をそのまま読み込み、Biome は GritQL のファイル（`lint/biome/*.grit`）を読み込みます。メッセージには直し方を日本語で書いています。

| ルール                   | 止めるもの                                                                                                                                                                                         | Biome |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `button-type-in-form`    | `<form>` の中の Button・IconButton に `type` がない（既定は `type="button"` で送信しない）                                                                                                         | あり  |
| `metric-unit`            | Metric の `value` に単位がある（`"99.95%"`）。ESLint・Oxlint は `--fix` で `unit` に分けます                                                                                                       | あり  |
| `metric-change`          | Metric の `trend="up"` / `"down"` に `change` がない（矢印と色だけでは向きが読み上げられない）                                                                                                     | あり  |
| `dialog-close`           | Dialog・ConfirmDialog・Popover に `open` だけを渡す。Dialog の `footer` の Button が何もしない                                                                                                     | あり  |
| `confirm-dialog-trigger` | ConfirmDialog に `trigger` も `open` もない                                                                                                                                                        | あり  |
| `confirm-label`          | ConfirmDialog の `confirmLabel` が「OK」「はい」「実行」など                                                                                                                                       | あり  |
| `danger-tone`            | 「削除」などの ConfirmDialog・メニューの項目に `tone` の danger がない                                                                                                                             | あり  |
| `icon-button-label`      | IconButton の `label` が空か記号だけ                                                                                                                                                               | あり  |
| `icon-only-button`       | Button の中身がアイコンだけ（IconButton を使う）。アイコンとみなすものは下に書きました                                                                                                             | 一部  |
| `unit-outside-mono`      | `.lv-mono` の中に単位（%・円）がある                                                                                                                                                               | あり  |
| `no-legacy-prefix`       | 改名の前のクラス（`k-` で始まるもの）と CSS 変数（`--k-`）。改名に合わせて移るときのためのもの（[MIGRATION.md](../../MIGRATION.md)）。自分のアプリに `k-` で始まるクラスがあるときは外してください | あり  |
| `table-pagination`       | 並べ替えのある DataTable（`sortValue` のある列がある）と Pagination を同じ部品（いちばん近い関数）の中で使い、DataTable に `pageSize` も `dataMode` もない                                         | 一部  |

`@lievre/react` から読み込んだ部品だけを見ます。部品を自分のモジュールから出し直しているときは、ESLint と Oxlint の `settings` に `"lievre": { "importSources": ["@lievre/react", "@/ui"] }` と読み込み元を足します。

`icon-only-button` がアイコンとみなすのは、アイコンの部品集（`lucide-react`・`@radix-ui/react-icons`・`@heroicons/react`・`react-icons`。`@heroicons/react/24/outline` のような副パスも含む）から読み込んだもの、名前が `Icon` で終わるもの、lievre が書き出すアイコン（今はまだなく、足すときは名前を `Icon` で終えます）だけです。`<Button><FormattedMessage id="save" /></Button>` のように、ボタンの文字を出しているかもしれない部品は止めません。ほかの部品集を使うときは、ESLint と Oxlint の `settings` に `"lievre": { "iconSources": ["my-icons"] }` と足します。

`table-pagination` は、DataTable の外に置いた Pagination でページを送る表を止めます。行の作り方（`slice`・`filter`・自作の関数）は見ません。ページ送りは `pageSize` で DataTable に任せると、全件を並べ替えてから区切ります。サーバーで並べ替えて区切るときは `dataMode="server"` を渡します。並べ替えがあるかは、`columns={columns}` をこのファイルの宣言まで追って `sortValue` を探し、別のファイルから読み込んだ列なら、このファイルに `sortValue` があるかで決めます。見るのは、DataTable を囲むいちばん近い関数（部品）の中に Pagination があるときだけです。同じファイルの別の部品（カードの一覧など）が Pagination を使っていても止めません。そのかわり、Pagination を同じファイルの小さなフッターの部品に分けた書き方は見逃します。的外れな指摘で正しい表を止めるより、見逃しのほうがましと考えてこの範囲にしています。

### ESLint

```js
// eslint.config.js
import tseslint from 'typescript-eslint';
import lievre from '@lievre/react/lint';

export default [
  {
    files: ['**/*.tsx'],
    languageOptions: { parser: tseslint.parser },
    ...lievre.configs.recommended,
  },
];
```

`lievre.configs.recommended` は全ルールを `error` にします。1つずつ選ぶときは `plugins: { lievre }` と `rules: { 'lievre/metric-unit': 'error' }` のように書きます。

### Oxlint

JS プラグインで同じファイルを読み込みます。Oxlint の JS プラグインは alpha です（1.89.0 で確かめています）。

```json
{
  "jsPlugins": ["@lievre/react/lint"],
  "rules": {
    "lievre/button-type-in-form": "error",
    "lievre/metric-unit": "error",
    "lievre/metric-change": "error",
    "lievre/dialog-close": "error",
    "lievre/confirm-dialog-trigger": "error",
    "lievre/confirm-label": "error",
    "lievre/danger-tone": "error",
    "lievre/icon-button-label": "error",
    "lievre/icon-only-button": "error",
    "lievre/unit-outside-mono": "error",
    "lievre/no-legacy-prefix": "error"
  }
}
```

### Biome

使うルールの `.grit` を `plugins` に並べます（2.6.2 で確かめています）。

```json
{
  "plugins": [
    "./node_modules/@lievre/react/lint/biome/button-type-in-form.grit",
    "./node_modules/@lievre/react/lint/biome/metric-unit.grit",
    "./node_modules/@lievre/react/lint/biome/metric-change.grit",
    "./node_modules/@lievre/react/lint/biome/dialog-close.grit",
    "./node_modules/@lievre/react/lint/biome/confirm-dialog-trigger.grit",
    "./node_modules/@lievre/react/lint/biome/confirm-label.grit",
    "./node_modules/@lievre/react/lint/biome/danger-tone.grit",
    "./node_modules/@lievre/react/lint/biome/icon-button-label.grit",
    "./node_modules/@lievre/react/lint/biome/icon-only-button.grit",
    "./node_modules/@lievre/react/lint/biome/unit-outside-mono.grit",
    "./node_modules/@lievre/react/lint/biome/table-pagination.grit",
    "./node_modules/@lievre/react/lint/biome/no-legacy-prefix.grit"
  ]
}
```

Biome のプラグインの指摘には、ルールの名前が出ず `plugin` とだけ出ます。メッセージの文は ESLint と同じです。止めるのをやめる箇所には `// biome-ignore lint/plugin: 理由` を書きます。

#### Biome で書けないこと

どのルールも `.grit` を用意していますが、GritQL では次のことができないため、ESLint・Oxlint より見る範囲が狭くなります。

- **名前と読み込みを結べない。** `@lievre/react` から何かを読み込んでいるファイルの中で、`Button` などの名前の要素を見ます。`import { Button as KButton }` の別名は見つけられず、同じファイルで別のライブラリの `Button` も使っていると、そちらも見ます。`settings` に当たる設定がないため、`importSources` と `iconSources` も使えません。`icon-only-button` がアイコンの部品集とみなすのは、上の決まった4つだけです。
- **「子がすべてアイコン」を書けない。** 子の並びは決まった形でしか比べられないため、`icon-only-button` は、子がアイコン1つのときと `icon` だけのときに止めます。アイコンを2つ並べたものは ESLint・Oxlint だけが止めます。
- **変数を宣言まで追えない。** `table-pagination` は、`columns={columns}` の宣言を見られないため、ファイルのどこかに `sortValue` があれば、並べ替えのある表とみなします。並べ替えのない表と並べ替えのある表を同じファイルに置き、並べ替えのない方だけを Pagination で送ると、Biome だけが止めます。
- **`metric-unit` の自動の直しはない。** GritQL の書き換えでは、値を数値と単位に分けて2つの属性にする処理を書けないため、指摘だけにしています。
- **メッセージの中で `\"` を使えない。** Biome の GritQL は文字列の `\"` を正しく読まず、後ろの文字が化けます。そのためメッセージの例は `type='submit'` のように一重引用符で書き、ESLint・Oxlint の文もそろえています。
- Biome には JavaScript のプラグインもありますが、Developer Preview で、ESLint とは別の形の API（`defineRule` と `query`）です。同じ実装を読み込めないため、今は使っていません。

### 確かめ方

`packages/react/src/test/consumer-lint.test.tsx` が、ルールごとの通る例と止める例を ESLint・Oxlint・Biome の3つで流し、Oxlint の結果が ESLint とまったく同じか、Biome が同じ数を止めるかを確かめます。Biome の `.grit` のメッセージが ESLint のメッセージと同じ文かどうかも確かめます。ルールを足したら、`lint/index.js`・`lint/index.d.ts`・`lint/biome/` とこのテストに足してください。

## 使い方の約束

- 入力には必ず `label` を付け、ダイアログには説明を付けます。
- 状態は色だけでなく、文字でも伝えます。
- 数値・時刻・ID・コードには `.lv-mono`、文中の数値には `.lv-tabular` を使います。
- DataTable のページ送りは `pageSize` で DataTable に任せます（全件を並べ替えてから区切ります）。サーバーで並べ替えて区切るときは `dataMode="server"` と `totalCount` を渡します。ページが足りなくなると、最後のページに合わせて `onPageChange` を呼びます。`DataTableProps<T>` は `dataMode` で形の分かれる型なので、`Omit<DataTableProps<T>, …>` で包むと、`dataMode="server"` のときに要る props を型が見分けなくなります。包むときは、`Omit<DataTableProps<T> & DataTableClientProps, 'caption'> | Omit<DataTableProps<T> & DataTableServerProps, 'caption'>` のように形ごとに分けて書きます。
- フォーカスリングは消さず、動きを減らす設定に従います。
