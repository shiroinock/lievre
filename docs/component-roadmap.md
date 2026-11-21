# 部品の追加計画

lievre に足りない部品と、今ある部品に足りないバリエーション（大きさ・強さ・状態・密度など）を、ほかのデザインシステムと比べて洗い出し、優先順位と段階を付けたものです。段階ごとに PR に分けて実装します。

調べた時点：2026年11月21日（初版は2026年10月）。比べた版は次のとおりです。各システムの公式の文書・公式の GitHub の型定義を読みました。細かい有無は版で変わるので、実装の前にもう一度確かめてください。

| システム                | 版                                                         | 主な出どころ                                                                     |
| ----------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Material Design 3 / MUI | m3.material.io（2026-11-19 のデータ）、`@mui/material` 9.5 | https://m3.material.io/components 、https://github.com/mui/material-ui           |
| Fluent 2                | `@fluentui/react-components` 9.75                          | https://fluent2.microsoft.design 、https://github.com/microsoft/fluentui         |
| Carbon                  | `@carbon/react` 1.121                                      | https://carbondesignsystem.com 、https://github.com/carbon-design-system/carbon  |
| Atlassian               | `@atlaskit/*`（button 25.8 ほか、パッケージごと）          | https://atlassian.design/components                                              |
| Primer                  | `@primer/react` 38.46                                      | https://primer.style 、https://github.com/primer/react                           |
| Ant Design              | antd 6.7                                                   | https://ant.design 、https://github.com/ant-design/ant-design                    |
| Radix Themes            | `@radix-ui/themes` 3.3                                     | https://www.radix-ui.com/themes 、https://github.com/radix-ui/themes             |
| SmartHR UI              | smarthr-ui 104.0                                           | https://smarthr.design/products/components/ 、https://github.com/kufu/smarthr-ui |

## 1. lievre の今の部品とバリエーション

`packages/react/src/index.ts` が書き出している部品と、`packages/react/src/stories` の Story から数えました。

| まとまり             | 部品                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------- |
| 仕組み               | LievreProvider、useLievreTheme、PortalSurface、ToastProvider / useToast               |
| 文字・配置           | Text、Heading、Link、ActionLink、Container、Stack、Grid、Divider                      |
| 操作・入力           | Button、IconButton、TextField、Textarea、Checkbox、RadioGroup、Switch、Select（単一） |
| 案内・フィードバック | Alert、Toast、Tooltip、Progress、Skeleton、Spinner、EmptyState                        |
| 表示                 | Badge、Card、Avatar、Kbd、DescriptionList、VisuallyHidden                             |
| 移動                 | Tabs、Breadcrumb、Pagination                                                          |
| 重なり               | Dialog / DialogClose、ConfirmDialog、Popover、DropdownMenu                            |
| データ               | DataTable、Metric、Meter、Sparkline                                                   |

全体に効く軸は3つで、どの部品も従います：テーマ（Paper / Ink）、密度（comfortable 40px / compact 32px、タッチの画面は44px）、文字（standard 本文16px / interface 本文14px）。

部品ごとのバリエーション（props の名前と値）：

| 部品            | 種類・強さ                                         | 大きさ                                         | 状態・そのほか                                                                                 |
| --------------- | -------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Button          | `variant` primary / secondary / ghost / danger     | `size` sm 32 / md（密度）/ lg 48               | `loading`、`disabled`、先頭の `icon`                                                           |
| ActionLink      | `variant` primary / secondary / ghost              | `size` sm / md / lg                            | —                                                                                              |
| IconButton      | `variant` は Button と同じ（既定 ghost）           | `size` sm / md / lg（正方形）                  | `loading`、`disabled`、`tooltip`                                                               |
| Link            | 1種                                                | —                                              | —                                                                                              |
| Badge           | `tone` neutral / success / warning / danger / info | 1種                                            | `dot`                                                                                          |
| Alert           | `tone` 5種（アイコンは4種）                        | 1種                                            | `title` は必須、本文は任意。閉じる・操作の場所はない                                           |
| Toast           | `tone` success / error                             | 1種                                            | 5秒で消える。操作のボタンはない                                                                |
| Tooltip         | 1種                                                | —                                              | 位置は上だけ（Radix の既定）                                                                   |
| TextField       | 1種                                                | `controlSize` md / lg                          | `hint`、`error`、`required`（`*` の印）                                                        |
| Textarea        | 1種                                                | —                                              | `hint`、`error`、`required`                                                                    |
| Select          | 1種                                                | md だけ                                        | `hint`、`error`、`required`、選択肢の `disabled`                                               |
| Checkbox        | 1種                                                | 1種                                            | `indeterminate`、`hint`、`error`                                                               |
| RadioGroup      | 縦に並べるだけ                                     | 1種                                            | 選択肢ごとの `description`、`error`、`required`（「（必須）」の文字）                          |
| Switch          | ラベルが左・つまみが右                             | 1種                                            | `hint`                                                                                         |
| Tabs            | 下線の形                                           | 1種                                            | `count`、`disabled`                                                                            |
| Progress        | 線の形                                             | 1種                                            | 値は必須（不確定の形はない）、`showValue`                                                      |
| Spinner         | —                                                  | `size` sm 16 / md 24                           | `showLabel`                                                                                    |
| Skeleton        | 四角だけ                                           | `width` / `height`                             | —                                                                                              |
| Avatar          | 頭文字だけ（画像なし）                             | `size` sm / md                                 | —                                                                                              |
| Card            | 枠と面の1種                                        | —                                              | `eyebrow`、`title`、`action`                                                                   |
| Dialog          | 1種                                                | 幅は1種                                        | `eyebrow`、`footer`                                                                            |
| ConfirmDialog   | `tone` default / danger                            | —                                              | 非同期の `onConfirm`                                                                           |
| Popover         | 1種                                                | 幅は中身次第                                   | `side`、`align`                                                                                |
| DropdownMenu    | 項目は item / checkbox / radio / separator         | 密度に従う                                     | `icon`、`shortcut`、`tone` danger。入れ子・説明文はない                                        |
| Pagination      | 前後のボタンと「2 / 5」                            | sm                                             | ページ番号を並べる形・件数の選択はない                                                         |
| Breadcrumb      | 1種                                                | —                                              | 省略はない                                                                                     |
| DataTable       | 罫線の形1種                                        | 密度に従う                                     | 並べ替え、行の選択、ページ分け（手元・サーバー）、空・読み込み中。見出しの固定・行の展開はない |
| DescriptionList | `layout` row / stack                               | `columns` 1〜3、`labelWidth`                   | 項目ごとの `mono`・`wide`                                                                      |
| Text            | `tone` default / muted                             | `size` small / body / lead                     | 行数の切り詰めはない                                                                           |
| Heading         | —                                                  | `size` section / title / display、`level` 1〜6 | —                                                                                              |
| Divider         | 横だけ                                             | —                                              | `label`                                                                                        |
| Stack / Grid    | `direction`、`align`                               | `gap`（4px の格子）、`minWidth`                | 主軸の揃え（justify）はない                                                                    |

画面例（`packages/react/src/patterns`、`packages/react/src/App.tsx`）で部品にならずに手で組まれているもの：

- 手順の表示（`Everyday.tsx` の `everyday-steps`）→ Stepper
- 操作の履歴（`Operations.tsx` の `activity-list`）→ Timeline
- 表の上の検索と絞り込み（`Operations.tsx` の `queue-tools`）→ 表の操作バー
- サイドバー（`App.tsx` の `app-sidebar`）→ AppShell

## 2. 部品の比較

○＝ある、△＝近いもの・別パッケージ・一部だけ、—＝公式の一覧や型定義に見当たらない。M3 の列は M3 の仕様か MUI のどちらかにあれば ○ です。

| 部品                               | lievre | M3 / MUI | Fluent | Carbon | Atlassian | Primer | Ant | Radix Themes | SmartHR |
| ---------------------------------- | :----: | :------: | :----: | :----: | :-------: | :----: | :-: | :----------: | :-----: |
| 入力のまとまり（Field / Fieldset） |   △    |    ○     |   ○    |   ○    |     ○     |   ○    |  ○  |      —       |    ○    |
| チェックボックスの組               |   —    |    ○     |   ○    |   ○    |     ○     |   ○    |  ○  |      ○       |    ○    |
| チップ・タグ                       |   △    |    ○     |   ○    |   ○    |     ○     |   ○    |  ○  |      —       |    ○    |
| 数のバッジ（Counter）              |   △    |    ○     |   ○    |   △    |     ○     |   ○    |  ○  |      —       |    ○    |
| 切り替え（SegmentedControl）       |   —    |    ○     |   —    |   ○    |     —     |   ○    |  ○  |      ○       |    ○    |
| 押して入り切りするボタン（Toggle） |   —    |    ○     |   ○    |   △    |     △     |   —    |  —  |      —       |    —    |
| ボタンの組・分割ボタン             |   —    |    ○     |   ○    |   ○    |     ○     |   △    |  △  |      —       |    ○    |
| 開閉（Accordion）                  |   —    |    ○     |   ○    |   ○    |     —     |   △    |  ○  |      △       |    ○    |
| 単一選択のコンボボックス           |   —    |    ○     |   ○    |   ○    |     △     |   ○    |  ○  |      —       |    ○    |
| 複数選択のコンボボックス           |   —    |    ○     |   ○    |   ○    |     △     |   ○    |  ○  |      —       |    ○    |
| 日付の入力                         |   —    |    ○     |   △    |   ○    |     ○     |   —    |  ○  |      —       |    ○    |
| 時刻の入力                         |   —    |    ○     |   △    |   ○    |     ○     |   —    |  ○  |      —       |    ○    |
| 手順の表示（Stepper）              |   —    |    ○     |   —    |   ○    |     ○     |   —    |  ○  |      —       |    ○    |
| ドロワー（Drawer / Sheet）         |   —    |    ○     |   ○    |   ○    |     ○     |   △    |  ○  |      —       |    —    |
| 画面の枠・サイドナビ               |   —    |    ○     |   ○    |   ○    |     ○     |   ○    |  ○  |      —       |    ○    |
| 検索欄                             |   —    |    ○     |   ○    |   ○    |     △     |   △    |  ○  |      △       |    ○    |
| 数値の入力                         |   —    |    △     |   ○    |   ○    |     —     |   —    |  ○  |      —       |    △    |
| ファイルの添付                     |   —    |    —     |   —    |   ○    |     —     |   —    |  ○  |      —       |    ○    |
| スライダー                         |   —    |    ○     |   ○    |   ○    |     ○     |   —    |  ○  |      ○       |    —    |
| ページ上部のお知らせ（Banner）     |   —    |    —     |   △    |   △    |     ○     |   ○    |  △  |      —       |    ○    |
| 説明のポップアップ（Toggletip）    |   —    |    —     |   ○    |   ○    |     △     |   —    |  —  |      —       |    —    |
| 履歴（Timeline）                   |   —    |    △     |   —    |   —    |     —     |   ○    |  ○  |      —       |    ○    |
| ツリー                             |   —    |    △     |   ○    |   ○    |     △     |   ○    |  ○  |      —       |    —    |
| 一覧（List / ActionList）          |   —    |    ○     |   ○    |   ○    |     —     |   ○    |  ○  |      ○       |    ○    |
| 道具の並び（Toolbar）              |   —    |    ○     |   ○    |   —    |     —     |   ○    |  —  |      —       |    —    |
| その場で直す（InlineEdit）         |   —    |    —     |   —    |   ○    |     ○     |   —    |  △  |      —       |    —    |
| 写すボタン（CopyButton）           |   —    |    —     |   —    |   ○    |     —     |   —    |  △  |      —       |    —    |
| 案内のツアー（Tour / Coachmark）   |   —    |    —     |   ○    |   ○    |     ○     |   —    |  ○  |      —       |    —    |
| 評価（Rating）                     |   —    |    ○     |   ○    |   —    |     —     |   —    |  ○  |      —       |    —    |
| カルーセル                         |   —    |    ○     |   ○    |   —    |     —     |   —    |  ○  |      —       |    —    |
| 浮かぶ操作ボタン（FAB）            |   —    |    ○     |   —    |   —    |     —     |   —    |  ○  |      —       |    —    |

lievre の △：Field は TextField・Select・RadioGroup がそれぞれラベルを内蔵している。チップは Badge が近い。数のバッジは Tabs の `count` だけ。

## 3. バリエーションの比較

今ある部品について、比べた8つのうち多くが持っていて lievre にないバリエーションです。「持つ数」は、8つのうち公式の props や部品としてそれを持つものの数で、目安です（近いものだけのときは数えません）。優先度は部品と同じく、高・中・低です。

### 案内・フィードバック

| 部品       | 足りないもの                           | 持つ数 | 優先度 | lievre での注意                                                                                                                             |
| ---------- | -------------------------------------- | :----: | :----: | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Alert      | 操作の場所（`action`）                 |   5    |   高   | 「再読み込み」「詳細を見る」など。ボタンは Button の sm。                                                                                   |
| Alert      | 閉じる（`onDismiss`）                  |   5    |   高   | 閉じるボタンは IconButton。閉じたあとフォーカスを失わせない（呼び出し側に戻し先を決めさせる）。`danger` の Alert は閉じさせない選択も残す。 |
| Alert      | 強さ（面を色で塗る強い形）             |   4    |   低   | 状態の色の面は大きく塗ると目立ちすぎる。今の淡い面のままにし、強さは Banner で出す。                                                        |
| Toast      | `tone` info / warning                  |   5    |   高   | 名前は Toast の今の `'error'` に合わせる。                                                                                                  |
| Toast      | 操作のボタン（元に戻す など）          |   5    |   高   | WCAG 2.2.1（時間の調整）：操作のある通知は自動で消さない。Radix の `altText` で、通知から離れても同じ操作ができる場所を読み上げる。         |
| Toast      | 表示の時間（`duration`）               |   4    |   中   | 5秒より短くしない。                                                                                                                         |
| Progress   | 不確定の形（値が分からない）           |   7    |   高   | `value` を省くと不確定。動きを減らす設定では動かさず、「処理中」の文字で示す。`aria-valuenow` を付けない。                                  |
| Progress   | 状態（完了・失敗）                     |   5    |   中   | 色だけでなく、ラベルの横に「完了」「失敗」の文字とアイコンを出す。                                                                          |
| Progress   | 太さ・円形                             |   4    |   低   | 円形は Meter と役割が重なる。                                                                                                               |
| Badge      | 強さ（`emphasis` 淡い面 / 塗り）       |   6    |   中   | 塗りは状態の色の面に `--lv-surface` の文字。状態の色は面に対して4.5:1 なので、逆にしても4.5:1。                                             |
| Badge      | 大きさ（`size` sm）                    |   5    |   中   | 表のセルや Tabs の中で使う。12px の文字のまま、高さを 20px から 16px にする。                                                               |
| Badge      | 数のバッジ（Counter）                  |   7    |   中   | 数は等幅。「未読 3件」のように読み上げる言葉を必須にする。                                                                                  |
| Tooltip    | 位置（`side`、`align`）                |   7    |   中   | Popover と同じ名前。                                                                                                                        |
| Tooltip    | 名前か説明か（label / description）    |   4    |   低   | 今は IconButton の名前にだけ使っている。説明に使うときは `aria-describedby` に。                                                            |
| Skeleton   | 形（文字の行・円・四角）               |   6    |   中   | 文字の行は `--lv-line-body` の高さで並べ、読み込み後に行の箱がずれないようにする。                                                          |
| Spinner    | 大きさ（lg 48）                        |   6    |   低   | パネル全体の読み込みでも md 24 で足りることが多い。                                                                                         |
| EmptyState | 大きさ（表やパネルの中で使う小さな形） |   2    |   中   | 表の空の表示（DataTable）と同じ形をそろえる。                                                                                               |

### 操作・移動

| 部品         | 足りないもの                               | 持つ数 | 優先度 | lievre での注意                                                                                                                       |
| ------------ | ------------------------------------------ | :----: | :----: | ------------------------------------------------------------------------------------------------------------------------------------- |
| Button       | 後ろのアイコン（`iconEnd`）                |   7    |   中   | 外部への移動や開閉（ChevronDown）。アイコンと文字の縦の中心は今と同じ検査。                                                           |
| Button       | 幅いっぱい（`block`）                      |   6    |   中   | 狭い画面の申し込みの「次へ」。                                                                                                        |
| Button       | 押して入り切り（`pressed`、ToggleButton）  |   5    |   中   | `aria-pressed`。入っているときは `--lv-selected` の面と文字の太さ。色だけにしない。                                                   |
| Button       | 押せない理由（`disabledReason`）           |   1    |   中   | SmartHR のもの。押せない理由をツールチップか補助文で伝える。`disabled` のボタンにはフォーカスが届かないので、`aria-disabled` にする。 |
| Button       | 数（`count`）                              |   2    |   低   | Counter を中に入れれば足りる。                                                                                                        |
| ButtonGroup  | ボタンの組・分割ボタン                     |   6    |   中   | 分割ボタンは Button と DropdownMenu の組み合わせ。間の線が重なって2pxにならないこと。                                                 |
| Link         | 控えめな色（`muted`）・外部の印            |   5    |   中   | 外部へのリンクは、アイコンだけでなく「（新しいタブで開く）」を読み上げる。下線は消さない（色だけでリンクを示さない）。                |
| Tabs         | アイコン                                   |   6    |   中   | アイコンは補助。言葉は消さない。                                                                                                      |
| Tabs         | 移動のタブ（URL で切り替える TabNav）      |   4    |   中   | 中身を持たず、`aria-current="page"` の Link を並べる。Tabs の ARIA（tablist）は使わない。                                             |
| Tabs         | 縦に並べる・幅いっぱい                     |   5    |   低   | 縦は設定画面向け。SideNav と役割が近い。                                                                                              |
| Pagination   | ページ番号を並べる形                       |   6    |   高   | 番号は等幅。いまのページは `aria-current="page"` と面の色。間は「…」で省く。                                                          |
| Pagination   | 1ページの件数の選択・件数の表示            |   3    |   中   | DataTable の `pageSize` とつなぐ。「全 128 件中 1〜20 件」。                                                                          |
| Breadcrumb   | 長いときの省略                             |   4    |   中   | 省いた分は DropdownMenu で開く。                                                                                                      |
| DropdownMenu | 入れ子（サブメニュー）                     |   7    |   中   | Radix の Sub。右矢印で開き、左矢印で戻る。                                                                                            |
| DropdownMenu | 項目の説明文・ふつうの項目のグループ見出し |   6    |   中   | 説明文は `aria-describedby`。                                                                                                         |
| DropdownMenu | 開く向き（`side`）                         |   7    |   低   | Popover と同じ名前。                                                                                                                  |

### 入力

| 部品       | 足りないもの                         | 持つ数 | 優先度 | lievre での注意                                                                                                                       |
| ---------- | ------------------------------------ | :----: | :----: | ------------------------------------------------------------------------------------------------------------------------------------- |
| 入力すべて | 必須の示し方をそろえる               |   —    |   高   | TextField・Select・Textarea は `*`（読み上げない）、RadioGroup は「（必須）」とばらばら。「必須」の文字にそろえる（Field で一度に）。 |
| TextField  | 前後の飾り（単位・アイコン・接頭辞） |   7    |   高   | 単位（円・件・%）は入力欄の外に言葉で添え、`aria-describedby` で読む。アイコンは補助。                                                |
| TextField  | 読むだけ（`readOnly`）の見た目       |   6    |   高   | 無効（disabled）と見分ける。読むだけは値を4.5:1 で読め、フォーカスも届く。                                                            |
| TextField  | 大きさ sm（32px）                    |   7    |   中   | 表の上の絞り込みなど、密度とは別に小さくしたい場面。                                                                                  |
| TextField  | 文字数と上限                         |   5    |   中   | 6章の「文字数の表示」と同じ。数は等幅。上限に近づいたことを色だけで示さない。                                                         |
| TextField  | 幅（`width`）                        |   3    |   中   | 郵便番号・年など、入る文字数に合わせた幅（`ch` ではなく、等幅なら 0.5em 単位）。                                                      |
| TextField  | 等幅の入力（ID・コード）             |   2    |   中   | `.lv-mono` を入力欄にも。                                                                                                             |
| TextField  | 入力の消去                           |   2    |   低   | SearchField に持たせる。                                                                                                              |
| Textarea   | 自動の高さ                           |   6    |   中   | `field-sizing: content` が使えるブラウザではそれで、使えないときは行数を固定。                                                        |
| Textarea   | 文字数と上限                         |   5    |   中   | TextField と同じ。                                                                                                                    |
| Select     | 大きさ（sm / lg）                    |   7    |   高   | TextField に `controlSize` lg があるのに Select にない。並べたときに高さがそろわない。                                                |
| Select     | 選択肢のグループ                     |   5    |   中   | Radix の Group と Label。                                                                                                             |
| Checkbox   | 組（CheckboxGroup）                  |   8    |   高   | 5章の Field・Fieldset と一緒に。                                                                                                      |
| RadioGroup | 横に並べる（`orientation`）          |   5    |   高   | 「はい・いいえ」など短い選択肢。狭い幅では縦に戻す。                                                                                  |
| RadioGroup | カードの形（RadioCards）             |   4    |   中   | 料金の選択など。カード全体が当たり判定で、選んだカードは線と面の両方で示す。                                                          |
| Checkbox   | カードの形（CheckboxCards）          |   2    |   低   | RadioCards と同じ形で作れる。                                                                                                         |
| Switch     | ラベルの位置・大きさ                 |   5    |   低   | 設定の一覧では今の右つまみが読みやすい。                                                                                              |

### 表示・重なり・データ

| 部品      | 足りないもの                            | 持つ数 | 優先度 | lievre での注意                                                                                                             |
| --------- | --------------------------------------- | :----: | :----: | --------------------------------------------------------------------------------------------------------------------------- |
| Dialog    | 幅（`size` sm / md / lg）               |   7    |   高   | 確認は sm、フォームは md、表の詳細は lg。狭い画面では全幅。ConfirmDialog は sm に固定。                                     |
| Dialog    | 全画面                                  |   4    |   低   | 狭い画面で lg が全幅になれば足りる。                                                                                        |
| Text      | 行数の切り詰め（`maxLines`）            |   7    |   高   | 切った全文は `title` ではなく、詳細の画面や Tooltip で読めるようにする。表の長い件名で要る。                                |
| Text      | 太さ（`weight`）                        |   6    |   中   | regular / medium / bold の3つ。                                                                                             |
| Heading   | 大きさの段                              |   7    |   中   | 今の3段（section 18 / title 22 / display 36）に、小見出し（16）と 28 を足して5段にする。                                    |
| Avatar    | 画像                                    |   6    |   中   | 画像が読めないときは頭文字に戻す。`alt` ではなく `aria-label` の名前を保つ。                                                |
| Avatar    | 大きさの段（24 / 32 / 40 / 48）         |   7    |   中   | 4px の格子に乗せる。                                                                                                        |
| Avatar    | 四角（組織・取引先）・グループ          |   6    |   低   | グループは「ほか3人」を言葉で。                                                                                             |
| Card      | 種類（枠 / 面だけ / 押せる / 選べる）   |   6    |   中   | 押せるカードは中の見出しのリンクを全体に広げる（入れ子のボタンを作らない）。影は使わない。                                  |
| Card      | 内側の余白の段                          |   3    |   低   | 密度で足りる。                                                                                                              |
| Popover   | 幅の段                                  |   3    |   低   | 中身次第で足りる。                                                                                                          |
| DataTable | 見出しの固定                            |   4    |   高   | 長い表をスクロールしたときに見出しが消えない。`focus-room` の検査で輪郭が切れないこと。                                     |
| DataTable | 密度を表ごとに                          |   6    |   中   | 画面は comfortable のまま、表だけ compact にする。今は LievreProvider を入れ子にすれば足りるので、まずは例を Story で示す。 |
| DataTable | 行の展開                                |   3    |   中   | 開閉のボタンに `aria-expanded`。                                                                                            |
| DataTable | 縞                                      |   1    |   低   | lievre は罫線で行を分ける。縞は選択の面と紛らわしい。                                                                       |
| DataTable | 列の固定                                |   2    |   低   | 横に長い表で。                                                                                                              |
| Divider   | 縦                                      |   4    |   中   | 道具の並びの区切り。`aria-orientation="vertical"`。                                                                         |
| Kbd       | 大きさ                                  |   1    |   低   | 置いた場所の文字の大きさで足りる。                                                                                          |
| Stack     | 主軸の揃え（`justify`）・折り返しの指定 |   —    |   中   | 画面例で `style` を足して組んでいる。                                                                                       |

### バリエーションを足すときの約束

- **名前を部品の間でそろえる**：強さは `variant`、状態の色は `tone`、大きさは `size`（入力は今の `controlSize` を残すか、Field で `size` にまとめるかを Field の段階で決める）、開く向きは `side` / `align`。同じ意味に別の名前を付けない。
- **大きさは操作の高さの段に乗せる**：24 / 32 / 40 / 48px（タッチは44px）。文字は 12 / 14 / 16px のどれか。新しい大きさには `control-height` と `{ padding }` の検査をかける。
- **色の組を足したらコントラストのテストを足す**：文字は4.5:1、操作の輪郭・フォーカス・状態を示す形は3:1を、Paper と Ink の両方、質感（wear）を重ねた面でも `packages/react/src/test/contrast.test.tsx` で止める。
- **状態を色だけで示さない**：選んだ・入っている・失敗したは、文字・アイコン・線の太さのどれかを必ず添える。
- **動きは動きを減らす設定に従う**：不確定の Progress、Skeleton、開閉の動きは `prefers-reduced-motion: reduce` で止める。
- **Story を足す**：バリエーションごとに Story を足し、`layoutGate` に測る部品を書く（[配置の品質基準](quality-gate.md)）。

## 4. 優先順位の付け方

次の5つで見ました。

1. **業務画面で要るか**：探す・読む・申し込む・管理するのどれで、どのくらい使うか。
2. **多くのシステムが持っているか**：2章・3章の表で ○ や持つ数が多いものは、利用者が「あって当然」と思う。
3. **lievre の方針と合うか**：影なし・面と線・状態は色と言葉で・数値は等幅。浮かぶ部品（メニュー・ポップオーバー）は影の代わりに線と面の明るさで浮かせる必要がある。
4. **実装の土台があるか**：今使っている `radix-ui`（1.8）にあるか、ほかに頼れる実装があるか。
5. **アクセシビリティの難しさ**：キーボード操作・読み上げ・フォーカスの扱いを自前で作る量。

### 依存を増やすときの約束

依存はなるべく増やしません。`radix-ui` にない機能（コンボボックス、和暦に対応した日付の入力など）を補うために増やすのは認めますが、操作の統一感を崩すことは認めません。土台を足すときは、次をすべて満たすことを条件にします。

- **操作が同じ**：キーボード（矢印・Home / End・Esc・Enter・型での選択）、閉じたあとのフォーカスの戻り先、外側を押したときの閉じ方、IME の変換中の扱いが、`radix-ui` の部品と同じであること。
- **見た目と枠が同じ**：フォーカスの輪郭、ポップアップの線と面、`PortalSurface` によるテーマの引き継ぎ、重なりの順序（z-index）を lievre の側で共通にする。
- **API が同じ**：利用者には土台の違いが見えないようにする。`label`・`description`・`error` などの prop は Field と同じ形にし、土台の型を外に出さない。
- **検査で確かめる**：開閉する部品に共通の操作のテストを用意し、土台の違う部品にも同じテストを通す。
- **範囲を限る**：足す土台は、必要な部品のためだけに使い、すでに `radix-ui` にある部品を置き換えない。

優先度は、高＝次の実装でまず入れる、中＝業務画面を広げるときに要る、低＝必要が出たら、です。

## 5. 部品ごとの評価

各部品の「品質基準で見る点」は、配置の品質基準の CI（[quality-gate.md](quality-gate.md)）で特に確かめたいことです。IconButton・Popover・DropdownMenu・ConfirmDialog・DescriptionList・Spinner・VisuallyHidden は作り終えていて、ここの評価は作る前の記録として残しています。

### 優先度：高

#### IconButton（アイコンだけのボタン）

- **理由**：表の行の操作、閉じる、サイドバーの開閉など、どの画面にもある。CSS（`lv-icon-button`）がすでにあり、画面例でも使っているのに、部品として書き出していないため、利用者が `aria-label` を付け忘れやすい。
- **参考**：Primer の IconButton（`aria-label` を必須にしている）、Radix Themes の IconButton。
- **lievre での注意**：`label` を必須の prop にして、Tooltip と同じ言葉を出す。variant と size は Button と揃える。
- **品質基準で見る点**：正方形であること（幅＝高さ＝操作の高さ）。アイコンの中心とボックスの中心が縦横とも一致すること。密度ごとの高さ（40 / 32px、タッチで44px）。フォーカスの輪郭が親の `overflow` で切れないこと。

#### Field・Fieldset・CheckboxGroup（入力のまとまり）

- **理由**：申し込み画面では、ラベル・補助文・エラー・必須の印を、どの入力でも同じ形にする必要がある。今は TextField・Select・RadioGroup がそれぞれ別に持っていて、日付やコンボボックスを足すたびに作り直すことになる。複数のチェックボックスをまとめる部品もない。
- **参考**：Primer の FormControl、SmartHR UI の FormControl / Fieldset、Radix の `Label`。
- **lievre での注意**：今の TextField などはこの Field を使って作り直し、見た目と API は変えない。必須は「必須」の文字で示し、`*` や色だけにしない。エラーは赤の線だけでなく、記号と文で示す。
- **品質基準で見る点**：ラベル・入力・補助文の縦の間隔が部品をまたいで同じ値であること。ラベルの左端と入力の左端が揃うこと。チェックボックスの四角と1行目の文字の縦の中心が揃うこと（2行に折り返したときも1行目に合わせる）。

#### ErrorSummary（入力の誤りの一覧）

- **理由**：Field のエラー表示と同時に設計すれば、各項目へのリンクとフォーカスの移し方を一度で決められるため、高にした。長い申し込みフォームで、送信したあとにどこが誤っているかを先頭でまとめて示す。ほかのシステムの表にはあまりないが、行政の申し込みでは定番（GOV.UK など）。
- **参考**：GOV.UK Design System の Error summary、デジタル庁のフォームの指針。
- **lievre での注意**：Alert を土台にし、各項目へのリンクで該当の入力に移動する。送信後にここへフォーカスを移す。
- **品質基準で見る点**：Alert のアイコンと見出しの縦の中心。リンクの一覧の左端が見出しの文字の左端と揃うこと。

#### DropdownMenu（メニュー）

- **理由**：表の行の「その他の操作」、並べ替えの選択、アカウントのメニューなど、管理画面で頻繁に使う。表のほぼすべてのシステムが持っている。
- **参考**：`radix-ui` の DropdownMenu（キーボード操作・型での選択・入れ子に対応）、Primer の ActionMenu。
- **lievre での注意**：影を使わないので、1px の線と `--lv-surface` の面で背景から分ける。PortalSurface でテーマを引き継ぐ。危険な操作は赤の文字と言葉（「削除」）で示し、色だけに頼らない。
- **品質基準で見る点**：項目の左右の余白が上下の区切りと揃うこと。アイコンのある項目とない項目で文字の開始位置が揃うこと（アイコン列の幅を固定）。チェック印の列の幅。右端のショートカット（Kbd）の右揃え。項目の高さが密度に従うこと。

#### Popover（ポップオーバー）

- **理由**：絞り込みの条件、日付の選択、補足の説明など、Tooltip では入らない操作できる中身を出す。日付の入力やコンボボックスの土台にもなる。
- **参考**：`radix-ui` の Popover、Carbon の Toggletip（説明用）。
- **lievre での注意**：DropdownMenu と同じく線と面で浮かせる。矢印の飾りは付けない。Tooltip との使い分け（操作できる中身があるなら Popover）を Story に書く。
- **品質基準で見る点**：内側の余白がパネルの内側（20 / 16px）と同じ値であること。開いた元の部品との距離が 4px の倍数であること。画面の端で位置を変えたときにはみ出さないこと。

#### ConfirmDialog（確認ダイアログ）

- **理由**：削除・取り消し・送信の確認は管理画面で必ず要る。今の Dialog で組めるが、ボタンの順番、初めにフォーカスする場所、危険な操作の示し方が画面ごとにばらつく。
- **参考**：`radix-ui` の AlertDialog、Primer の ConfirmationDialog、SmartHR UI の ActionDialog。
- **lievre での注意**：初めのフォーカスは取り消し側に置く。危険な操作のボタンには、何が起きるかを動詞で書く（「3件を削除」）。主要操作は1つという Button の約束を守る。
- **品質基準で見る点**：ボタンの並びの右揃えと間隔。ダイアログの見出しと閉じるボタンの縦の中心。本文の幅が読みやすい長さに収まること。

#### DescriptionList（説明リスト）

- **理由**：詳細画面・確認画面で「項目名：値」を並べる形は業務画面の基本。画面例で3か所も手で組まれている。
- **参考**：Radix Themes と Mantine の DataList、SmartHR UI の DefinitionList、デジタル庁の説明リスト。
- **lievre での注意**：`<dl>` の意味を保つ。値が数値・ID・日時なら `.lv-mono` を使えるようにする。横並びと縦積みを、幅に応じて切り替える。
- **品質基準で見る点**：項目名の列の幅が揃うこと。項目名と値の1行目のベースラインが揃うこと（等幅の値と日本語の項目名が混ざっても）。行の間隔が密度に従うこと。

#### Combobox（単一選択のコンボボックス）

- **理由**：取引先・担当者・品目など、選択肢が多くて Select では探せない場面で必須。表のほぼすべてのシステムにある。
- **参考**：React Aria の `useComboBox`、Ariakit の Combobox、Downshift。`radix-ui` にはない。
- **lievre での注意**：ARIA の combobox パターンは読み上げソフトごとの差が大きく、アクセシビリティの難しさは高い。土台は自作せず React Aria などに頼るのがよい。日本語の変換中（IME の `compositionstart`〜`compositionend`）に候補を絞り込んだり Enter で確定したりしない。ひらがな・カタカナ・全角半角の違いを無視して一致させる（後述の正規化）。
- **品質基準で見る点**：入力欄の高さが Select・TextField と同じこと。右端の開閉アイコンの縦の中心。候補の一覧の左右の余白が入力欄の内側の余白と揃うこと（文字の開始位置が上下でずれない）。

#### DatePicker（日付の入力）

- **理由**：DESIGN.md の今後の候補。申し込み（生年月日・希望日）にも管理（期間の絞り込み）にも要る。
- **参考**：React Aria の DatePicker（`@internationalized/date` が和暦 `JapaneseCalendar` に対応）、react-day-picker（shadcn/ui の Calendar）、SmartHR UI の Calendar / WarekiPicker。
- **lievre での注意**：カレンダーを開かなくても、年・月・日を直接入力できることを先にする（生年月日はカレンダーでは選びにくい）。日付は Lievre Mono で桁を揃える。土日・祝日を色だけで示さない。期間の入力（開始日〜終了日）も最初から想定しておく。和暦の表示は `Intl.DateTimeFormat('ja-JP-u-ca-japanese')` で出せる。
- **品質基準で見る点**：カレンダーの7列が同じ幅で、1桁と2桁の日付が各セルの中心に来ること。曜日の見出しと日付の列の中心が揃うこと。今日・選択中の印の円がセルの中心に来ること。

### 優先度：中

#### Accordion・Disclosure（開閉）

- **理由**：読む画面と申し込む画面向けで、管理画面での出番は少なく、ほかの部品で代わりがきくため中にした。よくある質問、申し込みの補足、詳しい条件など、読む画面と申し込む画面で多い。デジタル庁と SmartHR UI の両方にある。
- **参考**：`radix-ui` の Accordion / Collapsible、デジタル庁のアコーディオンとディスクロージャー。
- **lievre での注意**：開閉の状態は向きの変わる矢印だけでなく、読み上げで「展開」「折りたたみ」が伝わるようにする。見出しのレベルを prop で選べるようにする。区切りは 1px の線。
- **品質基準で見る点**：開閉の矢印アイコンと見出しの1行目の縦の中心。見出しが2行に折り返したときの矢印の位置（1行目に合わせる）。開いた中身の左端が見出しの文字の左端と揃うこと。

#### Stepper（手順の表示）

- **理由**：申し込みを複数の画面に分けるときに使う。画面例に手組みがある。
- **参考**：デジタル庁のステップナビゲーション、SmartHR UI の Stepper、Carbon の ProgressIndicator。
- **lievre での注意**：`<ol>` で順番を伝え、今の段に `aria-current="step"` を付ける。済み・今・まだを色だけでなく「完了」などの言葉か記号で示す。番号は等幅。
- **品質基準で見る点**：番号の円と段の名前の縦の中心。段どうしをつなぐ線の高さが円の中心と一致すること。段の名前が折り返しても円の位置が動かないこと。

#### MultiCombobox（複数選択のコンボボックス）

- **理由**：DESIGN.md の今後の候補。タグ付け・担当者の複数指定・絞り込みに要る。
- **参考**：SmartHR UI の MultiCombobox、Carbon の FilterableMultiSelect、Primer の SelectPanel、Mantine の MultiSelect。
- **lievre での注意**：単一の Combobox と土台を共有して後から作る。選んだ値はチップで並べ、各チップに「○○を外す」と読み上げる削除ボタンを付ける。件数が多いときは「ほか5件」とまとめる。
- **品質基準で見る点**：チップの縦の中心が入力欄の中心と一致すること。チップが折り返して2行になったときの行の間隔と、入力欄の上下の余白が4pxの倍数で保たれること。

#### Chip・Tag（チップ・タグ）

- **理由**：選んだ絞り込み条件の表示、MultiCombobox の値、分類の表示に使う。Badge（状態）とは役割が違う。
- **参考**：デジタル庁のチップタグ・チップラベル、Primer の Token、Carbon の Tag。
- **lievre での注意**：状態は Badge、分類と選んだ値は Chip と使い分けを決める。選択中に緑を使わない（ウルトラマリン）。
- **品質基準で見る点**：文字と削除アイコンの縦の中心。左右の余白が左右で同じであること（削除アイコンのある側だけ余白が広くならない）。

#### Drawer（ドロワー）

- **理由**：表の行を開いたときの詳細、狭い画面のナビゲーション。画面例のサイドバーも開閉している。
- **参考**：`radix-ui` の Dialog を横から出す形（shadcn/ui の Sheet）、Atlassian の Drawer、デジタル庁のドロワー。
- **lievre での注意**：影を付けず、境界の1pxの線と背景の覆いで分ける。モーダル（フォーカスを閉じ込める）か、そうでないかを分けて決める。
- **品質基準で見る点**：見出しと閉じるボタンの縦の中心が Dialog と同じであること。内側の余白がパネルと同じ値であること。

#### AppShell・SideNav（画面の枠とサイドナビ）

- **理由**：管理画面の枠は利用者が毎回自分で組むことになり、ずれやすい。`App.tsx` にすでに手組みがある。
- **参考**：Primer の NavList / PageLayout、Carbon の UI Shell、SmartHR UI の AppHeader / SideNav。
- **lievre での注意**：サイドバーはテーマの枠の色（`--lv-frame`、Paper ではウルトラマリン）を使う決まりを部品で守る。今いる場所は `aria-current="page"` と面の色の両方で示す。
- **品質基準で見る点**：ナビの項目のアイコンと文字の縦の中心、アイコン列の幅が揃って文字の開始位置が揃うこと。折りたたんだときのアイコンの左右中央。

#### SegmentedControl（切り替え）

- **理由**：表示の切り替え（一覧・カード、日・週・月）に使う。Tabs との違いは中身の領域を持たないこと。
- **参考**：`radix-ui` の ToggleGroup、Radix Themes の SegmentedControl、Primer の SegmentedControl。
- **lievre での注意**：選択中は `--lv-selected` の面と文字の太さで示す。Tabs・RadioGroup との使い分けを Story に書く。
- **品質基準で見る点**：各区切りの幅と左右の余白。アイコンと文字を並べたときの縦の中心。外枠の線と区切り線が重なって2pxにならないこと。

#### TimeField（時刻の入力）

- **理由**：DESIGN.md の今後の候補。予約・勤怠・配送の時間帯。
- **参考**：React Aria の TimeField、Carbon の TimePicker、SmartHR UI の TimePicker。
- **lievre での注意**：24時間表記を基本にする。等幅で表示する。DatePicker と同じ土台で作る。
- **品質基準で見る点**：時・分の区切り（`:`）の位置が揃うこと。TextField と高さが同じこと。

#### NumberField・金額の入力

- **理由**：数量・金額・割合の入力は業務画面で多い。桁区切りと単位を付けた表示は、lievre の「数値は比べられるように」と直接つながる。
- **参考**：React Aria の NumberField（`Intl.NumberFormat` で桁区切り）、Mantine の NumberInput、Carbon の NumberInput。
- **lievre での注意**：全角数字の入力を半角に直して受け付ける。単位（円・件・%）を入力欄の外に言葉で添える。等幅で右揃えにする。増減のボタンは数量のときだけにし、金額には付けない。
- **品質基準で見る点**：単位の文字と入力欄の文字のベースラインが揃うこと。右揃えの数値の右端が、表の数値の列と同じ位置になること。

#### SearchField（検索欄）

- **理由**：探す画面の入口と、表の上の絞り込み。画面例に手組みがある。
- **参考**：デジタル庁の検索ボックス、Carbon の Search。
- **lievre での注意**：`role="search"` の範囲と、消去ボタンの読み上げ（「検索語を消す」）。IME の変換中に検索を走らせない。
- **品質基準で見る点**：先頭の虫眼鏡アイコンと文字の縦の中心。アイコンと文字の間隔、消去ボタンの右の余白が左の余白と同じであること。

#### TableToolbar（表の操作バー・一括操作）

- **理由**：管理画面の表には、検索・絞り込み・選んだ行への一括操作がほぼ必ず付く。画面例の `queue-tools` と `queue-selection` が手組み。
- **参考**：Carbon の TableToolbar とバッチ操作、SmartHR UI の BulkActionRow、デジタル庁のテーブルコントロール。
- **lievre での注意**：DataTable の選択の状態とつなぐ。選んだ件数を `role="status"` で伝える（「3件を選択中」）。件数は等幅。
- **品質基準で見る点**：バーの左右の余白が表のセルの左右の余白と揃い、文字の開始位置が表の1列目と一致すること。バーの中の部品の高さが揃うこと。

#### Format（数値・日付・金額の書式）

- **理由**：lievre の約束「数値は等幅で、単位と変化の向きを言葉でも添える」を、部品で守らせる。SmartHR UI にも Formatter がある。
- **参考**：`Intl.NumberFormat`、`Intl.DateTimeFormat`（和暦は `ja-JP-u-ca-japanese`）、`Intl.RelativeTimeFormat`。
- **lievre での注意**：見た目の部品というより、`.lv-mono` / `.lv-tabular` と書式をまとめた小さな部品。`<time datetime>` を出す。Metric・DataTable の数値の表示もこれで揃える。
- **品質基準で見る点**：表の中で使ったときに桁の位置（右揃え・小数点の位置）が揃うこと。

#### FileUpload（ファイルの添付）

- **理由**：申し込みの添付書類（本人確認書類・証明書）で要る。デジタル庁と SmartHR UI にある。
- **参考**：デジタル庁のファイルアップロード／ドロップエリア、SmartHR UI の InputFile / DropZone、Carbon の FileUploader。
- **lievre での注意**：ドラッグできなくても、ふつうのボタンで選べることを先にする。形式と大きさの上限を先に言葉で書く。読み込み中は Progress、失敗は理由を文で示す。
- **品質基準で見る点**：ファイル名・大きさ（等幅）・削除ボタンの行の縦の中心。ドロップする領域の点線の枠の内側の余白。

### 優先度：低

#### Timeline（履歴）

- **理由**：申請の経過や操作の履歴に使うが、DescriptionList と一覧で代わりがきく。画面例に手組みがある。
- **参考**：Primer の Timeline、SmartHR UI の Timeline。
- **lievre での注意**：時刻は等幅。状態の点は色だけでなく言葉を添える。
- **品質基準で見る点**：点の中心と1行目の文字の縦の中心。縦の線が点の中心を通ること。

#### Spinner（読み込み中の印）

- **理由**：Progress・Skeleton・Button の読み込み中で多くは足りている。単独で使う場面（パネル全体の読み込み）のために書き出すだけでよい。
- **参考**：Button の中の Loader2、Radix Themes の Spinner。
- **lievre での注意**：`prefers-reduced-motion` で回転を止める。「読み込み中」の文を読み上げる。
- **品質基準で見る点**：文字と並べたときの縦の中心。

#### VisuallyHidden（画面から隠す読み上げ用の文字）

- **理由**：表の行の操作ボタンなどに読み上げ用の文を足すのに使う。小さく、すぐ作れる。
- **参考**：`radix-ui` の VisuallyHidden。
- **lievre での注意**：今ある隠し用の CSS（`.lv-sr-only`、DataTable の caption などで使用）を部品にする形で揃える。
- **品質基準で見る点**：配置に影響しないこと（はみ出しの検査で誤検出しないこと）。

#### Slider（スライダー）

- **理由**：業務画面では数値の入力欄のほうが正確で、使う場面は少ない。
- **参考**：`radix-ui` の Slider。
- **lievre での注意**：値は必ず数値でも表示し、入力欄と併用できるようにする。
- **品質基準で見る点**：つまみの中心と線の中心の一致。目盛りの数値の位置。

#### VirtualTable（仮想化した表）

- **理由**：DESIGN.md の今後の候補。数千行を一度に出す画面では要るが、多くの業務画面はページ送りで足りる。
- **参考**：`@tanstack/react-virtual` と `@tanstack/react-table`、MUI X の DataGrid。
- **lievre での注意**：アクセシビリティの難しさは高い（`aria-rowcount` / `aria-rowindex`、見えていない行への移動、印刷）。今の DataTable の API を保ったまま、行の描画だけを差し替える形にする。
- **品質基準で見る点**：行の高さが密度ごとに固定で、スクロールしても列の位置と見出しがずれないこと。

#### Chart（実データのチャート）

- **理由**：DESIGN.md の今後の候補。Sparkline と Metric で足りない、軸と凡例のある図。
- **参考**：Sparkline と同じ SVG の自作、または visx。MUI X Charts、Mantine Charts。
- **lievre での注意**：色だけで系列を分けない（線の種類・ラベルを直接付ける）。軸の数値は等幅。図と同じ内容を表でも読めるようにする。アクセシビリティの難しさは高い。
- **品質基準で見る点**：軸の目盛りと数値ラベルの中心。凡例の印と文字の縦の中心。

#### TreeView（ツリー）・CommandPalette（コマンドパレット）・TableOfContents（目次）

- **理由**：組織図やフォルダ（ツリー）、上級者向けの操作（コマンドパレット）、長い読み物（目次）など、使う画面が限られる。目次は読む画面を増やすときに中に上げる。
- **参考**：Primer の TreeView、cmdk（shadcn/ui の Command）、デジタル庁の目次。
- **lievre での注意**：ツリーはキーボード操作の作り込みが多く、難しさは高い。目次は今いる節を `aria-current` で示す。
- **品質基準で見る点**：ツリーの階層ごとの字下げが 4px の倍数で揃うこと、開閉の矢印と文字の縦の中心。

## 6. 日本語の業務に特有のもの

ほかのシステムの表にはほとんど出てこないが、日本の申し込み・管理画面ではよく要るものです。多くは見た目の部品より、入力の扱い（hook や関数）として作るのがよいと考えます。

| 項目                   | 優先度 | 理由と形                                                                                                                                          | lievre での注意                                                                                                                                                                                                                             | 品質基準で見る点                                       |
| ---------------------- | :----: | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 全角・半角の正規化     |   高   | 数字・英字・記号の全角を半角に直す関数と、入力欄の設定。電話番号・郵便番号・金額・メールで必ず要る。Combobox の一致、NumberField の土台にもなる。 | `normalize('NFKC')` は半角カナを全角にし、記号も変えるので、項目ごとに直す範囲を選べるようにする。変換中（IME）には直さず、確定後か入力欄を離れたときに直す。直したことを黙って行わず、例を補助文で示す。                                   | 見た目の部品ではないので配置の検査は不要。             |
| 和暦の表示と入力       |   中   | 生年月日や行政の書類で和暦を求められる。表示は Format で、入力は DatePicker の選択肢として。SmartHR UI の WarekiPicker が参考。                   | 元号の切り替わり（例：平成31年4月30日と令和元年5月1日）、「元年」の表記。西暦との併記を基本にする。                                                                                                                                         | 元号・年・月・日の欄の幅と、等幅の数字の揃い。         |
| 郵便番号から住所       |   中   | 郵便番号を入れると都道府県・市区町村を埋める。住所の入力欄の組（都道府県の Select、市区町村、番地、建物名）とあわせて部品にする。                 | データの取り方（日本郵便の公開データ、外部の API）は部品に持たせず、引数で関数を受け取る。自動で埋めた欄を利用者が直せること、埋めたことを `role="status"` で伝えること。7桁・ハイフンの有無の両方を受け付ける。                            | 郵便番号の欄と「住所を入れる」ボタンの高さと縦の中心。 |
| 氏名とふりがな         |   中   | 姓・名の分けた入力と、ふりがなの欄。                                                                                                              | ふりがなを IME の変換から自動で埋める方法は環境ごとに不安定なので、手で入力するのを基本にし、自動は補助にとどめる。ひらがな・カタカナのどちらで受けるかを決め、もう一方は自動で直す。外国籍の人の氏名（姓・名に分けられない場合）を考える。 | 姓・名の欄の幅と間隔、ふりがなの欄との縦の間隔。       |
| 文字数の表示           |   低   | Textarea の文字数と上限の表示。                                                                                                                   | 全角を2と数える制度（全角換算）か、文字数かを prop で選べるようにする。絵文字などを1文字として数える（`Intl.Segmenter`）。数は等幅。                                                                                                        | 文字数の表示の右揃えと、補助文とのベースライン。       |
| 電話番号・法人番号など |   低   | 決まった形の番号の入力。                                                                                                                          | 全角・半角の正規化と、ハイフンの有無を両方受け付ける形で足りる。専用の部品は作らず、TextField と関数の組み合わせの例を Story で示す。                                                                                                       | なし。                                                 |

## 7. 実装の順番

初版の第1段階（IconButton・Popover・DropdownMenu・ConfirmDialog・DescriptionList・VisuallyHidden・Spinner）は作り終えました。残りを、今ある部品のバリエーションと新しい部品を合わせて、次の段階で進めます。各段階は1つの PR にし、段階ごとに `npm run typecheck && npm run lint && npm test` と `npm run test:layout` を通してから次へ進みます。

段階の番号は初版から付け直しました。[Combobox と DatePicker の土台](combobox-foundation.md) で「第2段階」と書いているのは、下の第5段階です。

### 第1段階：案内と状態のバリエーション

依存を足さず、`radix-ui` の今の部品の中で作れるものです。どれも高か中で、今の部品の API に props を足すだけなので、利用する側の書き換えは要りません。

1. Alert：`action`（操作の場所）と `onDismiss`（閉じる）
2. Toast：`tone` に info / warning、操作のボタン（`action`、操作のある通知は自動で消さない）
3. Progress：不確定の形（`value` を省く）と、`tone` success / danger（文字とアイコンを添える）
4. Badge：`emphasis` 淡い面 / 塗り、`size` sm
5. Dialog：`size` sm / md / lg

### 第2段階：入力のまとまりと、入力のバリエーション

大きいので、PR を2つに分けます。

第2段階の前半（入力のまとまり）：

1. Field・Fieldset・CheckboxGroup と ErrorSummary（5章）。TextField・Textarea・Select・Checkbox・RadioGroup を Field と Fieldset で組み直す。
2. 必須の示し方を「必須」の文字にそろえる。1つの入力では、入力の required（aria-required）が読み上げで「必須」と伝えるので、文字は読み上げから外して二重に読まない。Fieldset・RadioGroup・CheckboxGroup の legend では、まとまりの名前と一緒に読み上げる。
3. エラーは補助文を消さずにその下に出し、記号（アイコン）を添える。

第2段階の後半（入力のバリエーション）：

1. TextField：前後の言葉（`prefix`・`suffix`。単位は値に含めず `suffix` に）、先頭のアイコン（`icon`）、`readOnly` の見た目（破線の枠）、大きさ sm
2. Select：大きさ sm / lg（TextField と同じ `controlSize`）、選択肢のまとまり。どの大きさと密度でも、選択肢の文字を開く前の文字と同じ左端から始める
3. RadioGroup：横に並べる（`orientation`）

第2段階の残り（後半のあとに、別の PR で）：

1. TextField：幅（`chars`。入る文字数に合わせ、全角は2と数える）、等幅の入力（`mono`）
2. RadioGroup：カードの形（`variant="card"`。枠全体が押せて、選んだ枠は線と面と丸の3つで示す）
3. Textarea・TextField：文字数と上限（`maxCount`。上限を超えても入力は止めず、超えた数を言葉と記号で示す。読み上げは上限を一度と、入力が止まってから残りの数）、数え方（`countBy`。見た目の1文字か、全角を2と数えるか）
4. Textarea の自動の高さ（`autoResize`。CSS の `field-sizing` で4行分から12行分まで。対応しないブラウザでは高さは決まったまま）

Field で今の TextField・Select・RadioGroup を作り直すときは、配置の品質基準の CI（`npm run test:layout`）を通し、見た目が変わらないことを確かめます。

### 第3段階：操作と移動のバリエーション

大きいので、PR を3つに分けます。

第3段階の1（ボタン）：

1. Button：`iconEnd`、`block`、`pressed`（aria-pressed の入り切り。IconButton にも）、`disabledReason`（押せない理由。aria-disabled にしてフォーカスを届かせ、理由をツールチップと読み上げで伝える）
2. SegmentedControl（`radix-ui` の ToggleGroup。見た目と操作は ViewSwitch と同じ）
3. ButtonGroup（`attached` で隙間なくつなげ、間の線を1本にする）・SplitButton（Button と DropdownMenu をつなげる）

ViewSwitch を SegmentedControl の上に組み直して土台を1つにするのは、タイムライン型の段階2（`queue.tsx` を触る）がマージされてから行います。

第3段階の2（移動）：

1. Pagination：ページ番号を並べる形、件数の選択と表示
2. Breadcrumb の省略、Tabs のアイコンと移動のタブ（TabNav）

第3段階の3（メニューとツールチップ）：

1. DropdownMenu：入れ子、項目の説明文、グループ見出し、`side`
2. Tooltip の `side` / `align`

### 第4段階：表示と表のバリエーション

1. Text の `maxLines`・`weight`、Heading の5段、Stack の `justify`
2. Avatar の画像と大きさの段、Card の種類（押せる・選べる）
3. DataTable の見出しの固定・行の展開、表だけ compact にする例
4. Skeleton の形、EmptyState の小さな形、Divider の縦、Counter
5. Chip・Tag、Accordion・Disclosure

### 第5段階：申し込みと探す画面の入力（土台を1つ足す）

`radix-ui` にない部品で、Combobox の土台に Downshift、日付の計算に `@internationalized/date` を足します（理由は [Combobox と DatePicker の土台](combobox-foundation.md)）。

1. 全角・半角の正規化（関数）と Format
2. Combobox（単一）
3. DatePicker（年月日の直接入力 → カレンダー → 期間 → 和暦の表示）
4. SearchField・NumberField
5. Stepper（申し込みの流れを画面例で組み直す）

### 第6段階：管理画面を広げる部品

1. MultiCombobox（Chip を使う）
2. TableToolbar（DataTable の選択とつなぐ）
3. Drawer・AppShell・SideNav、Banner（ページ上部のお知らせ）
4. TimeField
5. FileUpload、郵便番号から住所、氏名とふりがな

優先度が低のもの（Timeline、Slider、VirtualTable、Chart、TreeView、Toolbar、InlineEdit、CopyButton、Toggletip、低のバリエーション）は、使う画面が出てきたときに個別に判断します。

## 8. 作らないもの

カルーセル・画像スライダー・評価（星）・メガメニューなど、宣伝やサイトの画面向けの部品は、いまは作りません。lievre は用途を業務に絞ってはいませんが、これらは読む・探す・申し込む・管理するの画面で要る場面が少ないためです。

## タイムライン的な UI のための部品

ここまでの章は、利用者が自分で探して動く「地形（トポグラフィ）的な UI」の部品が中心です。次に見るものをシステムが決めて1列に出す「タイムライン的な UI」でも組めるように、足りない部品と型をまとめます。原則と、どちらで組むかの決め方は [DESIGN.md の「地形とタイムライン」](../DESIGN.md#地形とタイムライン) にあります。先例は、1件ずつ判断する作業をタイムラインで組み、一覧にいつでも切り替えられるようにした ccpluck のウェブ画面です（件数と進み具合を常に出し、「すべて確認しました」で止まる）。

この章の段階は、上の「第1段階」からの段階とは別の並びで、「タイムライン型の段階1」のように呼びます。上の段階と同時に進めてかまいません。

### 今の lievre の偏り

| 見たところ                              | 今の形                                                     | タイムラインで足りないこと                                                               |
| --------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 移動（Tabs・Breadcrumb・Pagination）    | 全体の構造を見せて、行き先を利用者に選ばせる               | 「次の1件」を出す部品がない                                                              |
| DataTable の行の選択                    | 全部を並べて、一度に選ぶ                                   | 決めた順の記録、1つ戻す、あとで回す、決め直すがない                                      |
| Progress                                | 割合（%）だけ                                              | 「5 / 12 件を確認」のような件数の形がない                                                |
| EmptyState                              | 「まだ何もない」「見つからない」を示す                     | 「すべて終えた」と結果のまとめで止まる形がない                                           |
| 見せ方の切り替え                        | Tabs は別の中身に切り替える部品。SegmentedControl は未作成 | 同じ項目の見せ方を2つで切り替え、状態を共有する部品がない                                |
| Kbd・DropdownMenu の `shortcut`         | キーを見せるだけ                                           | `aria-keyshortcuts`、1文字のキーが効く範囲（WCAG 2.1.4）、IME の変換中の扱いの約束がない |
| 時間で動くもの                          | Toast は5秒で消える（操作のある通知は消さない）            | 自動で進む・流れる動きを止める、共通の約束と部品がない（WCAG 2.2.2）                     |
| 画面例（`Operations.tsx` の作業キュー） | 名前はキューだが、表と絞り込みだけ                         | 1件ずつ処理する見せ方の例がない                                                          |

### 部品ごとの評価

#### useDecisionQueue（列の状態）

- **理由**：項目・決定・あとで・決めた順の記録から、今の項目・このあと・済み・あとでの件数を組む。タイムラインと一覧の両方がこれを共有するので、状態を1つに保てる。
- **参考**：ccpluck の `timelineState`（`apps/web/src/model.ts`）。DOM に触れない純粋関数にしてテストしている。
- **lievre での注意**：状態は利用者が持てる形（制御）と、部品に任せる形（非制御）の両方にする。一覧で決めた項目も「済み」に入れる。
- **品質基準で見る点**：見た目の部品ではないので配置の検査は不要。純粋関数の単体テストで確かめる。

#### DecisionQueue（1件ずつ判断する列）

- **理由**：承認・振り分け・取り込む項目の選択・公開前の確認など、1件ずつ決めて片づける作業の本体。
- **参考**：ccpluck の「順に見る」、Slack のキャッチアップ（カードで1件ずつ見る）。
- **lievre での注意**：判断はボタンが先で、キーは近道。1文字のキーは列の中にフォーカスがあるときだけ効かせる。決めたらフォーカスを次の項目へ移し、進んだことを `role="status"` で読み上げる。済みは順に積み、押すと決め直せる。動きを減らす設定ではカードの入りを動かさない。
- **品質基準で見る点**：カードの内側の余白（Card と同じ）。判断のボタンの中の Kbd と文字の縦の中心。済みの印と文字の縦の中心。

#### QueueProgress（件数の進み具合）

- **理由**：終わりを見せる歯止めの中心。全体の件数・決めた数・あとでの数を常に出す。
- **参考**：ccpluck の「5 / 12 件を確認」、Stepper の「3 / 5」。
- **lievre での注意**：件数は等幅。線は Progress と同じ見た目にし、割合だけにしない。あとでの件数は別に書く。
- **品質基準で見る点**：件数の文字と見出しのベースライン、線の高さ。

#### 終わりの表示（DecisionQueue の中）

- **理由**：「すべて確認しました」で止まる場所。EmptyState は「何もない」の形なので、まとめと次の操作を持つ形を別に用意する。
- **lievre での注意**：決めた・決めなかったの件数をまとめ、次の作業へは利用者が選んで移る（自動で次の列を始めない）。最後に決めたあと、フォーカスをここへ移す。
- **品質基準で見る点**：EmptyState と同じ中央の揃え。

#### ViewSwitch（見せ方の切り替え）

- **理由**：「順に見る」「一覧から選ぶ」をいつでも行き来できるようにする。
- **参考**：ccpluck の表示の切り替え、`radix-ui` の ToggleGroup。
- **lievre での注意**：選んでいる側は面とウルトラマリンの線と文字の太さで示し、色だけにしない。読み上げには ToggleGroup の `role="radio"` と `aria-checked` で伝える。矢印で移動する。第3段階の SegmentedControl を作るときは、ViewSwitch と見た目と操作を合わせ、1つの土台にまとめる。
- **品質基準で見る点**：操作の高さと左右の余白（中央に文字を置くボタンと同じ0.4倍）、文字の中央。

#### 新着の知らせ（NewItemsNotice）

- **理由**：列の途中で項目が増えるとき、勝手に混ぜずに「新しく3件あります」と知らせ、利用者が取り込む。
- **参考**：X や GitHub の「新しい投稿を表示」。
- **lievre での注意**：押すまで列も件数も変えない。知らせは `role="status"` で、何度も読み上げない。
- **品質基準で見る点**：帯の内側の余白と文字の縦の中心。

#### 自動で進むものの止め方（PauseControl）

- **理由**：スライドや自動の更新のように、時間で進む動きをどうしても使うときの共通の止め方（WCAG 2.2.2）。
- **lievre での注意**：止める・戻す・再開を必ず付け、動きを減らす設定では最初から止めておく。DecisionQueue は時間で進まないので、これを使わない。
- **品質基準で見る点**：操作の高さと、状態の文字（「止めています」）の縦の中心。

### タイムライン型の段階1：1件ずつ判断する列の土台

依存を足さず、`radix-ui` の今の部品（ToggleGroup）と今のトークンで作ります。作り終えました（`packages/react/src/components/queue.tsx`）。

1. useDecisionQueue（状態の純粋関数とフック）
2. DecisionQueue（今の項目・判断のボタンと Kbd・あとで・1つ戻す・済みの積み・このあと数件・終わりの表示・列の中だけで効くキー）
3. QueueProgress（件数と線）
4. ViewSwitch（「順に見る」「一覧から選ぶ」）
5. Story（両方の見せ方で状態を共有する例）と、キーボード・フォーカス・読み上げ・axe のテスト

### タイムライン型の段階2：画面例と一覧とのつなぎ

1. `Operations.tsx` の作業キューに「順に見る」を足し、DataTable の行の選択と状態を共有する
2. 一覧へ切り替えたら今の項目の行へ、戻ったら今の項目へフォーカスを移す
3. 「残りの低いものをまとめて決める」の近道（根拠を言葉で示す）
4. 見せ方を URL に残す例

### タイムライン型の段階3：増えるものと時間で動くもの

1. NewItemsNotice（新着の知らせ）
2. PauseControl（自動で進むものの止め方）と、Toast の消えるまでの時間との関係の整理
3. `@lievre/tui` に同じ列と進み具合（端末では Y / N / L / Z のキーが主な操作になる）
