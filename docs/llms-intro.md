# KEI（@kei-design/react）

> 日本語の業務画面向けの React 部品と CSS トークン。この文書だけで部品を使えるように、使い方の約束と全部品の API をまとめています。後半の「部品」以降は `npm run llms` で型から生成しています。

## 始め方

```tsx
import { KeiProvider, ToastProvider } from '@kei-design/react';
import '@kei-design/react/styles.css';

<KeiProvider theme="paper" density="comfortable" typography="interface">
  <ToastProvider>{app}</ToastProvider>
</KeiProvider>;
```

- スタイルは `KeiProvider` が出す `.kei` の内側でだけ効きます。包み忘れても誤りは出ず、見た目が崩れるだけです。
- `useToast()` は `ToastProvider` の内側で呼びます。
- 書体は同梱していません（README の「別のプロジェクトで使う」）。

## 約束

- 入力（TextField・Textarea・Select・Checkbox・Switch・RadioGroup）には必ず `label` を渡します。部品が label・補助文・エラーを入力と結ぶので、`id`・外の `<label>`・`aria-*` は自分で書きません。エラーは部品の外に書かず `error` に渡します。
- 値の変更は Radix と同じ名前です：Switch・Checkbox は `onCheckedChange`、Select・RadioGroup・Tabs は `onValueChange`。`onChange` を受けるのは TextField・Textarea（ネイティブの属性）だけです。
- `Button` の `type` の既定は `'button'` です。フォームの送信には `type="submit"` を付けます。主要な操作（`variant="primary"`）は1つの作業領域に1つ。危険な操作は `variant="danger"`。画面の移動は `Link` / `ActionLink`。
- 状態の名前：Badge・Alert の `tone` は `'neutral' | 'success' | 'warning' | 'danger' | 'info'`、Toast の `tone` は `'success' | 'error'`。
- 状態は色だけでなく文字でも伝えます。Badge には必ず文字を入れます。Metric の `trend` は矢印と色だけなので、向きは `change` に言葉で書きます（「前週比 +0.02 ポイント上昇」）。
- 数値・時刻・ID・コードは `<span className="k-mono">`、文中の数値は `.k-tabular`。単位（%・円）は `.k-mono` の外に置きます：`<span><span className="k-mono">{n}</span>円</span>`。Metric は `value="99.95" unit="%"` と分けます。
- Dialog には `title` と `description` が必須です。閉じるだけのボタンは `<DialogClose asChild><Button>キャンセル</Button></DialogClose>` で包みます。処理してから閉じるときは `open` / `onOpenChange` で開閉を持ちます。フォーカスの閉じ込めと復帰は部品が行います。
- アイコンだけのボタンは `<IconButton label="行の操作" icon={<MoreHorizontal />} />`。`label` が読み上げの名前とツールチップの両方になるので、`aria-label` は書きません。`Button` に svg だけを入れません。
- 押して開く操作できる中身（絞り込み・表示の設定）は `Popover`、説明の短い文だけなら `Tooltip`。Popover の中の「適用」で閉じるときは `open` / `onOpenChange` で開閉を持ちます。
- 操作の一覧は `DropdownMenu` に `items` の配列で渡します（子要素では渡しません）。区切りは `{ type: 'separator' }`、入り切りは `type: 'checkbox'`、1つを選ぶ組は `type: 'radio'`。削除などは `tone: 'danger'` にし、label にも「削除」と書きます。
- 削除・送信の確認は Dialog で組まず `ConfirmDialog` を使います。`confirmLabel` には何が起きるかを動詞で書きます（「3件を削除」。「OK」「はい」にしない）。取り消せない操作は `tone="danger"`。`onConfirm` が Promise を返すと終わるまで閉じず、reject すると開いたままです。メニューの項目から開くときは `trigger` を省き、`open` / `onOpenChange` で持ちます。
- 「項目名：値」の一覧は `<dl>` を手で組まず `DescriptionList` に `items` で渡します。数値・ID・日時は `mono: true`。詳細や確認の画面は既定の `layout="row"`、項目を段に並べるときは `layout="stack" columns={2}`。
- 読み上げにだけ伝える文字は `<VisuallyHidden>`（`.k-sr-only` を手で書かない）。パネル全体の読み込みは `<Spinner label="一覧を読み込み中" showLabel />`、ボタンの中は `Button` の `loading`、形の分かる一覧は `Skeleton`。
- ラベルは日本語で書き、英大文字や記号で飾りません。

## 表の並べ替えとページ送り

ページ送りは DataTable に任せます。手元にある全件を `rows` に渡して `pageSize` を付けると、DataTable が全件を並べ替えてから区切り、表の下に件数と前後のページ送りを描きます。並べ替えを変えると1ページ目に戻ります。自分で `slice` した行を渡したり、`Pagination` を横に並べたりはしません。

```tsx
// const [page, setPage] = useState(1);
<DataTable
  caption="請求書"
  rows={filtered}
  columns={columns}
  getRowId={(r) => r.id}
  pageSize={10}
  page={page}
  onPageChange={setPage}
/>
```

`page` を渡さなければ DataTable が持ちます。絞り込みを変えたときに1ページ目へ戻すなら、上のように外で持って `setPage(1)` します。

サーバーが並べ替えて区切った1ページ分を受け取るときは `dataMode="server"` にします。手元では並べ替えず、`totalCount` からページ数を出します。この形では `sorting` / `onSortingChange` / `page` / `onPageChange` / `pageSize` / `totalCount` が型で必須です。

```tsx
<DataTable
  dataMode="server"
  caption="請求書"
  rows={data.items}
  totalCount={data.total}
  columns={columns}
  getRowId={(r) => r.id}
  loading={isFetching}
  sorting={sort}
  onSortingChange={setSort}
  pageSize={10}
  page={page}
  onPageChange={setPage}
/>
```

## 確かめ方

- 型（`tsc --noEmit`）が誤った props の大半を止めます。
- 次は型では止まりません：KeiProvider の包み忘れ、フォームの Button の `type="submit"` 忘れ、Metric の `value` に単位を含めること。書いた後にこの3点を見直してください。
