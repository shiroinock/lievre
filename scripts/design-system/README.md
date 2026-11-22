日本語の画面を読みやすく組み立てるための、個人の実験的なデザインシステムです。読み物・検索・申し込み・管理画面を同じトークンと部品から作ります。実験はしても、下の約束と WCAG 2.x AA は崩しません。

## 使い始める

- 画面全体を `LievreProvider` で包みます。スタイルは `.lievre` の内側でだけ効き、包み忘れても誤りは出ず見た目だけが崩れます。テーマは `theme="paper"`（明るい面）か `theme="ink"`（深い紺の面）。トークンの名前は共通で、値だけが入れ替わります。
- 本文の大きさは `typography="standard"`（16px、読み物）と `"interface"`（14px、操作画面）、密度は `density="comfortable"` と `"compact"` から、それぞれ独立に選びます。
- 通知（`useToast()`）を使うときは `ToastProvider` も置きます。
- 書体は同梱していません。`IBM Plex Sans JP` と `IBM Plex Mono` を読み込み、等幅には `'Lievre Mono'`（Plex Mono を `size-adjust: 83.333%` で読み込んだもの）を用意します。

## 4つの約束

1. **読める大きさを守る。** 本文は `lv-text-base`（16px）、操作画面は `lv-text-md`（14px）、補助は `lv-text-xs`（12px）。情報が多くても文字は縮めず、余白と行の高さで密度を調整します。
2. **色は役割で使う。** ウルトラマリンの `lv-accent` は「押せる・選んでいる」だけ。`lv-success`・`lv-warning`・`lv-danger`・`lv-info` は状態だけに使い、選択に緑は使いません。状態は色だけでなく文字や記号でも伝えます（Badge には必ず文字を入れる）。
3. **面と線で階層をつくる。** 影・光沢・内側のハイライトは使いません。面の明るさ（`lv-bg` → `lv-surface` → `lv-surface-raised`、凹みは `lv-surface-sunken`）、1px の線（`lv-border`、操作の輪郭は `lv-border-strong`）、余白で前後関係を示します。フォーカスの輪郭（`lv-focus`）だけは必ず残します。
4. **数値は比べられるように。** 数値・時刻・ID・コードは等幅（`.lv-mono`）で桁を揃え、単位と変化の向きを言葉でも添えます。文中の数値は `.lv-tabular` で桁だけ揃えます。単位（%・円）は `.lv-mono` の外に置きます。

## 色

- 文字は `lv-text`、補足は `lv-muted`、さらに控えめなものは `lv-subtle`。どれも `lv-bg`・`lv-surface`・`lv-surface-raised`・`lv-surface-sunken` の上で 4.5:1 以上あります。
- 押せるもの・選んでいるものは `lv-accent`。塗りの上の文字は `lv-on-accent`。選択の面は `lv-selected` で、面と 1.3:1、ホバーの面（`lv-surface-sunken`）とも 1.15:1 以上の差があります。選択した行は面だけに頼らず、左端に `lv-accent` の線も引きます。
- 状態の地は `*-soft`（`lv-success-soft` など）、その上の文字と記号は同じ系統の濃い色（`lv-success`）。危険の塗りの上は `lv-on-danger`。
- ウルトラマリンを面に使ってよいのは、アプリの枠（サイドバー）の `lv-frame` だけです。枠の上は `lv-on-frame`・`lv-frame-muted`・`lv-frame-line`、選択中は `lv-frame-selected` に `lv-on-frame-selected`。Ink では枠を `#191953` まで落とし、中身より目立たせません。メーター・カード・コード例など読む中身の地は `lv-surface` か `lv-surface-sunken` にします。
- 文字と背景は 4.5:1 以上、操作の輪郭とフォーカスは 3:1 以上を、両方のテーマでテストしています。

## 文字

- 見出し・本文・ラベルは `IBM Plex Sans JP`（`lv-font-sans`）。ラベルは日本語で書き、英字の大文字や記号で飾りません。
- 読み値・表の数値・時刻・ID・コードは等幅（`lv-font-mono`）。英数字を 0.5em 幅に縮め、日本語（1em 幅）とちょうど **1:2** になるようにしています。等幅の文字は `lv-text-mono-min`（英数字で 12px 相当）より小さくしません。
- 大きさは `lv-text-xs`〜`lv-text-3xl`（12 / 13 / 14 / 16 / 18 / 22 / 28 / 36px）。太さは `lv-weight-regular`・`lv-weight-medium`・`lv-weight-bold` の3つ。
- 行の高さは `lv-line-body`（1.7 倍）と `lv-line-tight`（1.45 倍）を使います。どちらも要素の文字の大きさから 4px の倍数に丸めるので、14px の本文は 24px、16px は 28px の行になります。

## 余白と形

- 余白は **4px の格子**に乗せます。`padding`・`margin`・`gap` は `lv-space-1`（4px）〜`lv-space-12`（48px）。0 と 1px（罫線の補正）だけが例外です。
- 操作の高さは `lv-control-height`（comfortable 40px、compact 32px）。左右の余白は、中央に文字を置くボタンが高さの 0.4 倍（`lv-control-padding`）、左に揃える入力が 0.3 倍（`lv-input-padding`）。
- Card・Dialog・Alert・Toast は上下左右の padding を同じ値（`lv-panel-padding`）にします。
- 角丸は `lv-radius-sm`（3px）・`lv-radius-md`（5px）・`lv-radius-lg`（8px）。丸い印（Avatar・Counter）だけ `lv-radius-full`。
- 中身は上下左右の中央に置き、文字の横のアイコンは1行目の中央に揃えます。

## してはいけないこと

- 影・グラデーション・光沢で浮かせる。
- カードや引用の**片側だけに色の帯**を付ける。何を示すのかが曖昧で、色だけの合図になります。枠全体・見出し・アイコンと文字で示します（選択中の行の線のような状態の印は別）。
- 中身の地をウルトラマリンにする。その上で「押せる・選んでいる」を示す色がなくなります。
- 色だけで状態を伝える。必ず文字か記号を添えます。
- 余白を 4px の格子から外す。

## 部品の選び方

- 画面の移動は `Link` / `ActionLink`、処理の実行は `Button`。主要な操作（`variant="primary"`）は1つの作業領域に1つ。危険な操作は `variant="danger"`。
- 入力には必ず `label` を渡します。部品が label・補助文・エラーを入力と結ぶので、`id`・外の `<label>`・`aria-*` は自分で書きません。必須は `required`。送信後の誤りは入力ごとの `error` に加えて、フォームの先頭に `ErrorSummary` を置きます。
- 1件ずつ判断して片づける作業（承認・振り分け・レビュー）は、`DecisionQueue` で「順に見る」見せ方を作れます。必ず一覧（`DataTable` など）と `ViewSwitch` で切り替えられるようにし、終わりと件数を見せ、時間で勝手に進めません。比べる・探す・並べ替える作業は一覧（地形）で組みます。
- 自動で動くものには `PauseControl` を同じ場所に付けます（WCAG 2.2.2）。

## ロゴ

うさぎと窓の外形は共通で、窓の中身だけが違います。Web は `</>`、24px 以下は `<>`、端末は `>_`。窓は強調色 `lv-accent` で塗ります。`assets/Logos/` にあります。

## 端末の部品

`@lievre/tui` は同じ色と文字の考え方で端末（Ink）に描く部品です。この見本集には入れていません。
