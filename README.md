# KEI（計）

業務の画面を読みやすく組み立てるための、日本語向けの React コンポーネントと CSS トークンです。設計の考え方は [DESIGN.md](DESIGN.md) にまとめています。

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

## 開発

```sh
npm run typecheck
npm test            # 部品・画面フロー・axe・コントラスト・トークン同期
npm run tokens      # kei.css を変更したら tokens.json を書き出す
npm run format
npm run build       # lib/・dist/・dist/storybook/
```

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
- スタイルは `.kei` の内側に限定されます。ページ全体のリセットやアプリのナビゲーションは含みません。
- `theme`（paper / ink）、`density`（comfortable / compact）、`typography`（standard / interface）はそれぞれ独立して指定できます。

## 使い方の約束

- 入力には必ず `label` を付け、ダイアログには説明を付けます。
- 状態は色だけでなく、文字でも伝えます。
- 比べる数値には `.k-tabular`、ID やコードには `.k-mono` を使います。
- ページ付きの DataTable では、全件を先に並べ替えてから区切ります（`sorting` / `onSortingChange`）。
- フォーカスリングは消さず、動きを減らす設定に従います。
