# KEI / 計 · v0.1.0

読み物・サービス・フォーム・Webアプリ・管理画面を支える日本語の汎用デザインシステム。81件の参考から、計器・構造・組版・素材の4軸を取り出した最初の実装案です。

## 起動

Node.js 22.12以降。リポジトリのルートで実行します。

```sh
npm ci
npm run storybook
```

Storybook: http://127.0.0.1:6006 。デザインの全体像を表示するデモは、別ターミナルで `npm run dev` → http://127.0.0.1:5173 。

`.npmrc` の `legacy-peer-deps=true` はnpmのoptional peer解決で発生する`edgesOut`エラーを回避するためです。依存のバージョンはpackage-lock.jsonに固定し、型・ビルド・テストで組み合わせを確認します。

## 内容

- `src/components`：Reactコンポーネントと型。
- `src/styles/kei.css`：ライブラリ本体のスタイルとCSS変数。
- `tokens/tokens.json`：色・文字・余白・形・密度・動きの交換用トークン。
- `src/stories`：各部品・状態・操作のStory。Controls、Autodocs、Accessibility、play関数。
- `src/docs`：導入と設計原則、色・文字・余白、参考からの翻訳。
- `src/patterns`：検索一覧、記事詳細、登録の入力・確認・完了、管理画面と設定。外部APIは使用しません。
- `DESIGN.md`：設計意図と参考との対応、制約。

## 検証とビルド

```sh
npm run typecheck
npm test
npm run build
```

`npm run build` はライブラリを`lib/`、デモを`dist/`、静的Storybookを`dist/storybook/`へ出力します。`npm run preview`でビルド済みデモと`/storybook/`を同じサーバーから確認できます。

`npm test`はjsdomでコンポーネント・画面フローとaxe-coreの自動検査を実行します。Storyのplay関数もportable storiesとして実行します。jsdomでは色のコントラストを判定できないため、テーマの意味色のコントラストは別の数値チェックを実行し、ブラウザのAccessibilityパネルと合わせて確認します。

## 別のプロジェクトで使う

```sh
npm run build:lib
npm pack
# 利用先のプロジェクトで
npm install /absolute/path/to/kei-design-react-0.1.0.tgz
```

```tsx
import { KeiProvider, ToastProvider, Button, TextField } from '@kei-design/react';
import '@kei-design/react/styles.css';

export function App() {
  return (
    <KeiProvider theme="paper" density="comfortable">
      <ToastProvider>
        <TextField label="ワークスペース名" defaultValue="計測ラボ" />
        <Button variant="primary">保存する</Button>
      </ToastProvider>
    </KeiProvider>
  );
}
```

パッケージはnpm未公開です。React / ReactDOMは利用先で用意します。スタイルは`.kei`の内側へスコープ化しています。ページ全体のresetやアプリのナビゲーションはライブラリに含めません。

## 配色

白に近い作業面、深い青の文字、鮮やかなウルトラマリンの操作色。サイドバーと計器面にも青い色面を使用。Paperは明るい紙面、Inkは青い暗部で、テーマ名とAPIは共通です。

## 面の共通ルール

通常面・操作部・浮かぶメニューを含め、box-shadowはすべてnone。上端ハイライト、入力内側の影、フッター側の影は使いません。単色の面、1pxの境界線、余白で階層を示し、ホバー・押下は面色、フォーカスはアウトラインで表現します。

## 主要な約束

- Paper / Inkは色の**意味**を共有し、実際の値を切り替える。
- 主要操作はウルトラマリン、正常は青緑。状態には必ず文字も付ける。
- 日本語本文はシステムサンセリフ、比較する数字・IDは等幅。
- `label`が必須の入力と、説明付きのDialogを使う。
- ページ付きDataTableは全件を先にソートし、`sorting` / `onSortingChange`で制御する。
- ポータルを使う部品はKeiProviderの配色を引き継ぐ。
- フォーカスリングを消さず、動きの低減を尊重する。

設計・APIは最初の案として調整可能です。すべての支援技術・ブラウザや実データでの本番検証を完了したものではありません。

## 文字・余白・情報密度

標準本文は16px、操作画面の本文は14px、ラベル13px、補助情報12px相当のremを基準にします。`typography="standard" | "interface"` で指定し、密度とは独立させます。標準は操作高40px／セル上下12px／パネル内20px、高密度は32px／8px／16px。文字を小さくせず余白を調整します。StorybookのFoundationsに密度比較、Patternsに320px領域＋文字間隔拡大の点検例があります。

## 汎用基盤と画面例

- トークン：配色・文字・余白・形・密度。
- 基礎：Text、Heading、Link、ActionLink、Container、Stack、Grid、RadioGroupと既存の入力・フィードバック・表示部品。移動はLink / ActionLink、処理はButtonを使います。
- パターン：探す（検索・絞り込み・空状態から復帰）、読む（記事本文・保存）、申し込む（検証・確認・修正・完了）、管理する（作業モニター・設定）。

`KeiProvider` は入れ子で未指定のtheme / density / typographyを引き継ぎます。ポータルにも同じ設定が届きます。標準本文16pxとinterface本文14pxの両方で、comfortable / compactを選択できます。

```tsx
<KeiProvider theme="paper">
  <Container width="reading">
    <Stack gap={6}>
      <Heading level={1} size="title">はじめよう。</Heading>
      <Text>長い説明も読み進められる、標準16pxの本文です。</Text>
      <ActionLink href="/start" size="lg">次へ進む</ActionLink>
    </Stack>
  </Container>
</KeiProvider>
```

`Dialog.eyebrow`、`EmptyState.eyebrow`は任意です。業務・データベース固有の見出しは表示しません。一般向け入力には`TextField controlSize="lg"`（16px・48px高）を使えます。Storybookの本文・配色・密度ツールバーで比較できます。

追加画面のStoryは320px・414pxのViewportでも確認できます。スマホでは余白を一箇所に集め、本文16pxを保ったまま導入文や区切りを調整します。登録時の不備には最初の入力または確認チェックへフォーカスが移り、説明まで表示されます。`Checkbox error="説明"` は赤い境界と関連付けたエラー文を表示します。

## 参考資料

[参考ピン81件と一覧ビューア](references/README.md)を同梱しています。元のPinterestリンク、サムネイル、分類、観察メモ、設計への応用候補を辿れます。
