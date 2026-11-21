# 変更履歴

利用する側に見える変更を、パッケージごとに書き残します。npm にはまだ公開していないので、すべて「未公開」の下にあります。

## 書き方

- `packages/*/src` の部品・スタイル・端末の部品、`packages/react` の `bin`・`lint`、`packages/tokens/tokens.css` を変える PR では、ここに1行足します。CI の「変更履歴」の検査が、書き忘れを止めます。
- 「未公開」の下の、パッケージ（`@lievre/tokens`・`@lievre/react`・`@lievre/tui`）の見出しに書きます。区分はこの順で、書くことのない区分は見出しごと省きます。
  - **見た目が変わる**：同じ使い方のまま、画面の見え方が変わるもの。
  - **振る舞いが変わる**：読み上げ・フォーカス・名前・API など、利用する側のコードやテストに響きうるもの。
  - **足したもの**：新しい部品・props・トークン。今の使い方には響かないもの。
  - **直したもの**：意図と違っていたものを直したもの。
- 1行に1つ、利用する側の言葉で書き、末尾に PR の番号を付けます（例：`（#32）`）。番号は PR を出してから足せば十分です。新しい行は区分の末尾に足します。
- 利用する側に見えない変更（テスト・Story・内部の整理だけ）は書きません。検査に当たるときは、PR の説明に `変更履歴：なし` で始まる1行と、その理由を書きます。
- 公開するときは「未公開」を版と日付（例：`## 0.3.0（2026-12-01）`）に改め、空の「未公開」を上に足します。

## 未公開

### @lievre/tokens

#### 振る舞いが変わる

- CSS 変数の頭を `--lv-` に、カスケードの層を `lievre.tokens` にした。移り方は [MIGRATION.md](MIGRATION.md) にある。（#23）

#### 足したもの

- トークンを `@lievre/tokens` に分けた。正は `tokens.css` で、そこから `tokens.json` を書き出す。`@lievre/react` は焼き込んで持つので、React で使うだけなら入れなくてよい。（#22）

### @lievre/react

#### 見た目が変わる

- 質感のソルトの既定値を `lievre` にし、同梱の焼き込みの画像を作り直した。擦れの位置が変わる（強さなどの値は同じ）。（#23）
- DecisionQueue の今のカードから、左の強調色の帯を外した。枠は全体に `--lv-border-strong` のまま。（#30）
- 必須の印を `*` から「必須」の文字にそろえた。色は赤ではなく `--lv-muted`。これまで `*` と「（必須）」が混ざっていた。（#32）
- `hint` と `error` を両方渡すと、両方が出る。これまでは `error` が `hint` と置き換わっていた。（#32）
- エラー文の前にアイコンが付く。（#32）
- Select の一覧の選択肢の文字が、開く前の文字と同じ左端から始まる。compact の密度で 4px ずれていたのを直したので、一覧の見た目が少し変わる。（#33）
- DecisionQueue の `bulk` のボタンの下に、押すと当たる項目（「対象：…」）を出し、ボタンの説明として読ませる。（#37）
- Pagination の `variant="numbers"` で、ページ番号と重なる「2 / 6」を画面から外した（読み上げの「6ページ中 2ページ目」は残す）。（#2）

#### 振る舞いが変わる

- lievre に改名した。パッケージ `@lievre/react`、`LievreProvider`・`useLievreTheme`、根のクラス `.lievre`・`.lievre-portal`、クラスの頭 `.lv-`、層 `lievre.*`、lint のルール `lievre/…`、書体 Lievre Mono など。移り方は [MIGRATION.md](MIGRATION.md) と `npx lievre-migrate` にある。（#23）
- 1つの入力の「必須」の文字は読み上げから外し、`required` か `aria-required` で伝える。Fieldset・RadioGroup・CheckboxGroup の `legend` では、まとまりの名前と一緒に「必須」を読み上げる。（#32）
- TextField・Textarea・Select・Checkbox を Field で、RadioGroup を Fieldset で組み直した。`hint` と `error` はどちらも `aria-describedby` で入力に結ぶ。書き出す名前と props は変わらない。（#32）
- DecisionQueue は、操作の結果（「『項目A』を『もらう』にしました」「2件を未決に戻しました」など）を先に読み上げ、続けて今の位置を知らせる。（#37）
- `decideItems` で2件以上を決めた操作は、`undoDecision` の1回で全部戻る。状態に省ける項目 `batches` を足した。1件ずつ決めた操作はこれまでどおり1件ずつ戻る。（#37）
- ViewSwitch を SegmentedControl で組み直した。クラスは SegmentedControl と同じ `.lv-segmented`・`.lv-segmented-item` になる。props・既定の言葉・見た目・読み上げ・キー操作は変わらない。（#42）

#### 足したもの

- `npx lievre-migrate`（改名の書き換え）と、拾えなかった古い名前を止める lint のルール `lievre/no-legacy-prefix`（ESLint・Oxlint・Biome）。（#23）
- Alert に `action`（本文の下の操作）と `onDismiss`・`dismissLabel`（閉じるボタン）。（#28）
- Toast の `tone` に `info`・`warning`。`action` を渡すと自動で閉じなくなり、`altText` で通知の外の同じ操作を読み上げる。（#28）
- Progress は `value` を省くと値の分からない形になる。`tone` の `success`・`danger` では、色に加えてアイコンと言葉（`statusLabel` で変えられる）を出す。（#28）
- Badge に `emphasis`（`soft`・`strong`）と `size`（`sm`・`md`）。（#28）
- Dialog に `size`（`sm` 400px・`md` 520px・`lg` 720px）。（#28）
- 1件ずつ判断する列：`DecisionQueue`・`QueueProgress`・`ViewSwitch`、`useDecisionQueue` と状態の関数（`getQueueSnapshot`・`decideItem`・`deferItem`・`undoDecision`）。（#29）
- 状態の関数 `decideItems`・`selectionOf`・`applySelection`、フックの戻り値の `decideMany`・`selected`・`setSelected`。DataTable の選択と状態を共有できる。（#31）
- DecisionQueue に `bulk`（まとめて決める近道）と `autoFocus`。（#31）
- 入力のまとまり：Field・Fieldset・CheckboxGroup・ErrorSummary。（#32）
- Select（開くボタン）と RadioGroup（最初の選択肢）に `id`。ErrorSummary から移るときに使う。RadioGroup に `hint`。（#32）
- 途中で増えた項目を、押すまで列に混ぜずに知らせる `useNewItems` と `NewItemsNotice`。（#34）
- 時間で動くものを止める・再開する `useAutoAdvance` と `PauseControl`。動きを減らす設定では止めた状態で始まる。（#34）
- TextField に `prefix`・`suffix`（前後の言葉。入力の説明として読み上げる）、`icon`（入力欄の中の先頭。読み上げない）、`controlSize` の `sm`（32px）。（#33）
- TextField の `readOnly` は枠を破線にし、地を透明にする。値は読める色のまま、フォーカスも届く。（#33）
- Select に `controlSize`（`sm`・`md`・`lg`）と、`{ label, options }` で見出しの付いたまとまり。（#33）
- RadioGroup に `orientation="horizontal"`（横並び。幅が足りないと折り返す）。（#33）
- TextField に `chars`（入る文字の数に合わせた幅）と `mono`（等幅の書体）。（#35）
- TextField・Textarea に `maxCount`（「12 / 100」の文字数。超えても入力は止めない）と `countBy`（`grapheme`・`width`）。（#35）
- Textarea に `autoResize`（書いた分だけ4行分から12行分まで伸びる）。（#35）
- RadioGroup に `variant="card"`（選択肢ごとに枠で囲む）。（#35）
- Field に `after`（入力のすぐ下の右端の表示）。（#35）
- 1つ戻すと戻る項目を返す `undoKeys`。（#37）
- Pagination に `variant="numbers"`（ページ番号を並べ、間は「…」で省く。今のページは `aria-current="page"`）、`totalCount`・`pageSize`（「128件中 21〜40件」）、`pageSizeOptions`・`onPageSizeChange`（表示件数の選択）。狭い幅では折り返す。（#39）
- Breadcrumb に `maxItems`（間を「…」のボタンにまとめ、押すとその場に出してフォーカスを移す）。（#39）
- Tabs の項目に `icon`（言葉の前。読み上げない）。（#39）
- リンクをタブの見た目で並べる `TabNav`（`nav` と `aria-current="page"`）。（#39）
- Button に `iconEnd`（文字の後ろのアイコン）、`block`（幅を親いっぱいに広げる）、`pressed`（押して入り切りするボタン。`aria-pressed`）、`disabledReason`（押せない理由。`aria-disabled` にしてフォーカスを届かせ、ツールチップと読み上げで伝える）。（#36）
- IconButton に `pressed`。（#36）
- 表示の形を切り替える `SegmentedControl`、関係のあるボタンを並べる `ButtonGroup`（`attached` で隙間なくつなげる）、主な操作とほかの方法のメニューをつなげた `SplitButton`。（#36）
- DropdownMenu に `{ type: 'submenu' }`（入れ子のメニュー。右矢印か Enter で開き、左矢印か Escape でその入れ子だけ閉じて親の項目へ戻る）、項目の `description`（項目の下の補足。`aria-describedby` で読み上げる）、`{ type: 'group' }`（見出しの付いたまとまり。見出しがまとまりの名前になる）、`side`（開く向き）。（#40）
- Tooltip に `side`・`align`。画面の端で入らないときは反対側に回る。（#40）
- Text に `maxLines`（その行数で切って「…」を出す）・`weight`（regular・medium・bold）。（#1）
- Heading の `size` に `minor`（16px）・`subsection`（18px）。（#1）
- Stack に `justify`（start・center・end・between）・`wrap`。（#1）
- Avatar に `src`（画像。読み込めないときは頭文字に戻す）、`size` に `lg`（40px）・`xl`（48px）、`shape="square"`（組織・取引先）。（#1）
- Card に `variant="plain"`（線のない凹んだ面）、`href`（見出しのリンクをカード全体に広げる）、`selection`（チェックボックスの当たり判定をカード全体に広げる選べるカード）。（#1）
- DataTable に `maxHeight`（表の中でスクロールし、見出しの行を上に残す）、`renderExpanded`・`expandedIds`・`onExpandedChange`（行を広げて中身を出す。開閉のボタンは `aria-expanded`）、`paginationVariant`・`pageSizeOptions`・`onPageSizeChange`（下のページ送りにページ番号と表示件数。件数を変えると1ページ目に戻る）。（#2）
- 分類や選んだ値を示す `Chip` と、その並び `ChipGroup`。何も渡さなければ表示だけの札（タグ）、`onRemove` で外せる札（外すボタンは「{label}を外す」と読み上げる）、`selected`・`onSelectedChange` で押して入り切りする絞り込みの札（`aria-pressed`。選んでいる間はチェックの印を添える）。`size` は md（32px）・sm（24px）。（#6）
- 見出しを押して中身を開閉する `Accordion`（`headingLevel` で見出しのレベル、`multiple` で同時に複数を開く。上下の矢印キーで見出しの間を移る）と、1つの補足を開閉する `Disclosure`。どちらも開閉を矢印の向きと `aria-expanded` で伝える。（#7）
- Skeleton に `shape`（`text` は本文の行の高さで `lines` 行並べ、最後の行を短くする。`circle` は `width` を直径にした丸）。（#5）
- EmptyState に `size="sm"`（小さなパネルや表の中に置く形。余白と文字を小さくし、絵は出さない）。（#5）
- Divider に `orientation="vertical"`（並びの高さに伸びる縦の線。`aria-orientation="vertical"` を付ける）と `decorative`（読み上げに区切りを伝えない）。（#5）
- 数を示す `Counter`。数字は等幅で、読み上げは `label` と `unit` を付けて「未読 12件」と伝える。`max` を超えると「99+」に縮める。`tone` は neutral・accent・danger。（#5）

#### 直したもの

- lint のルールの説明の URL が、リポジトリの改名のあと行き先のない見出しを指していた。`packages/react` の README の lint の節を指すようにした。（#26）
- Avatar の頭文字が、置いた場所の行の高さを受け継いで、上下の中央から少しずれることがあった。行の高さを部品で決めるようにした。（#1）

### @lievre/tui

#### 足したもの

- 端末の部品を `@lievre/tui` として足した。色と字の組を決める `core`（truecolor・256色・16色・色なし、ASCII の組）と、Ink で描く `ink`。（#22）
- 1件ずつ判断する列：`Queue`・`QueueProgress`・`useQueueInput` と、列の状態とキーの決まり（`queueKey`）。決まりは `@lievre/react` の DecisionQueue と同じ答えを返す。（#34）
- 字の組に進み具合の線（unicode は `━` `─`、ASCII は `#` `-`）。（#34）
- 動きの中核 `core/motion`：`--lv-motion`・`--lv-ease` から決める長さと曲線（最低 `MIN_FRAMES` フレーム）、字と役割の名前で持つ絵 `Grid`、入り方（`reveal`・`sweep`・`dissolve`・`typewriter`）と光の帯 `shimmer`、明るさ・形・点字で字を選ぶ `shade`・`shapes`・`braille`、動かすかを決める `motionPolicy`（`LIEVRE_MOTION=full|reduced|off`）。（#3）
