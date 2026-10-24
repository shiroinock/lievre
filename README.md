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
| `bench/agent`        | エージェント向けのベンチマーク                                 |

## 開発

```sh
npm run typecheck
npm run lint        # stylelint・ESLint の KEI 独自ルール（scripts/stylelint-kei.mjs、eslint.config.mjs）
npm test            # 部品・画面フロー・axe・コントラスト・トークン同期
npm run test:layout # 配置の基準をブラウザで測る（docs/quality-gate.md、初回は npx playwright install chromium）
npm run tokens      # kei.css を変更したら tokens.json を書き出す
npm run llms        # 部品の props や説明を変えたら llms.txt を書き出す
npm run bench:agent # エージェント向けのベンチマーク（docs/agent-benchmark.md）
npm run format
npm run build       # lib/・dist/・dist/storybook/
```

質感の試作（[references/wear-prototype.md](references/wear-prototype.md)）の強さを調整するときは、はじめに一度だけ `npm run wear:setup` を実行します。リポジトリの中の `.venv-wear/` に、フォントを焼くための fontTools と brotli を入れます。

```sh
npm run wear:setup  # .venv-wear/ を作る（uv があれば uv、なければ python3 -m venv と pip）
npm run wear:tune   # 調整の画面を開く
npm run wear:font   # wear.config.json の値でフォントを焼く
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

## 使い方の約束

- 入力には必ず `label` を付け、ダイアログには説明を付けます。
- 状態は色だけでなく、文字でも伝えます。
- 数値・時刻・ID・コードには `.k-mono`、文中の数値には `.k-tabular` を使います。
- ページ付きの DataTable では、全件を先に並べ替えてから区切ります（`sorting` / `onSortingChange`）。
- フォーカスリングは消さず、動きを減らす設定に従います。
