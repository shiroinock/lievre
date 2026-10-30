# Combobox と DatePicker の土台

部品の第2段階（Combobox・DatePicker など）のために、`radix-ui` のほかに足す土台を選んだ記録です。React Aria・Ariakit・Downshift の3つで同じ仕様の Combobox を試作し、[部品の追加計画](component-roadmap.md) の「依存を増やすときの約束」を満たせるかを比べました。試作のコードと検査は [spikes/combobox](../spikes/combobox/README.md) にあります（本体には入れていません）。

調べた時点：2026年10月25日。react-aria-components 1.22.1、@ariakit/react 0.4.42、downshift 9.4.0、radix-ui 1.8.1、React 19.3.1。ブラウザは Playwright 1.56.1 の Chromium と WebKit（Safari と同じエンジン）。

## 結論

**Downshift を Combobox の土台にし、一覧の枠（ポップアップ）は Radix の Popover にする。日付は `@internationalized/date` で計算し、DatePicker の画面の部分は KEI で作る。** React Aria と Ariakit は採りません。

- 足す依存がいちばん小さい（gzip で +9KB。Radix の Popover を足しても +11KB）。
- Downshift は状態・キーボード・ARIA だけを持ち、重なりを持たない。枠を Radix の Popover にすると、Esc・外側を押したとき・ポインターの通り方・重なりの順序が、Select や Dialog と同じ仕組み（Radix の DismissableLayer）に乗る。試作では、Dialog の中で使っても Select と同じに動いた。
- キーボードの動き（最初の矢印で先頭を選びかけにする、Home / End で先頭・末尾）が Select にいちばん近い。

React Aria は DatePicker と和暦まで持つ点が有力でしたが、自前の重なりの仕組みを持ち、Radix の Dialog の中で操作が崩れます。部品の単位では枠を Radix に差し替えられず、揃えるには Dialog の側を React Aria に合わせて直すか、hooks から組み直すことになります。どちらも「操作の統一感を崩さない」「範囲を限る」の約束に反するため、採りません（[7](#7-採らなかった案と理由)）。

## 1. 試作したもの

3つの土台で、同じ仕様の単一選択の Combobox を作りました。

- ラベル・補助文・エラー（`aria-describedby`・`aria-invalid`）、必須の印。props は Select と同じ形（`label`・`options`・`value`・`onValueChange`・`hint`・`error`）にし、土台の型は外に出さない。
- 候補の絞り込み。ひらがな・カタカナ・全角半角・大文字小文字の違いを無視する（NFKC にしてからカタカナをひらがなにする）。候補には読み（`kana`）を持たせ、漢字の社名も読みで探せる。
- キーボード（矢印・Home / End・Enter・Esc・Tab）。
- IME の変換中は、絞り込みも確定もしない。
- ポップアップは `PortalSurface` の中に出してテーマを引き継ぐ。見た目は kei.css の Select と同じ値（1px の線と面、フォーカスの輪郭）。

枠は2通りを試しました。土台そのものの枠（React Aria の Popover、Ariakit の ComboboxPopover、Downshift は floating-ui と `createPortal`）と、Radix の Popover を枠にしたもの（`+radix`）です。比べる基準として、同じ操作を KEI の Select（Radix）にも流しました。

3つの土台に共通の部分は `spikes/combobox/src/shared.tsx` に置きました。KEI に入れるときも、ここは土台によらず KEI の側で持つ部分です（正規化、IME の守り、PortalSurface の入れ物、Radix の枠）。

## 2. 依存の大きさ

今の KEI のライブラリ（`packages/react/src/library.ts`、react を外に出し、本番のビルド）に足したときの増分です。`npm run size`（`spikes/combobox/scripts/size.mjs`）で測りました。radix-ui の中身と同じパッケージ（floating-ui など）は、実際のライブラリと同じく1つにまとめています。

| 足すもの                                           | gzip の増分 | 新しく入るパッケージ                                                                     |
| -------------------------------------------------- | ----------: | ---------------------------------------------------------------------------------------- |
| Downshift（`useCombobox`）                         |     +9.1 KB | 9（downshift、@babel/runtime、prop-types など。tslib は radix-ui と共有）                |
| Radix の Popover（枠）                             |     +1.9 KB | 0（radix-ui に入っている。Popper・DismissableLayer は Select・Tooltip と共有）           |
| Downshift の試作の部品（KEI の層・枠を含む）       |    +13.0 KB | —                                                                                        |
| Ariakit（Combobox の部品一式）                     |    +42.7 KB | 8（@ariakit の7つと use-sync-external-store。floating-ui は radix-ui と共有）            |
| React Aria（ComboBox の部品一式）                  |    +69.1 KB | 11（react-aria、react-stately、@internationalized の3つなど。aria-hidden・tslib は共有） |
| React Aria（日本語の文言だけに絞った場合）         |    +62.6 KB | 公式のプラグイン（@react-aria/optimize-locales-plugin）を使う                            |
| React Aria の ComboBox と DatePicker（日本語だけ） |   +103.1 KB | —                                                                                        |
| `@internationalized/date`（日付の計算・和暦）だけ  |     +5.0 KB | 2（@internationalized/date、@swc/helpers）                                               |

基準の KEI のライブラリは gzip で 59.9KB です。React Aria の ComboBox だけで、今の KEI と同じくらいの大きさが足されます。

## 3. 操作を Select・Dialog と揃えられるか

`npm run check`（`spikes/combobox/test/behavior.mjs`）で、7通りの組み合わせと Select に同じ操作を流しました。全部の結果は [spikes/combobox/test/summary.md](../spikes/combobox/test/summary.md) にあります。ここでは、約束に関わる点を抜き出します。

### Dialog の中では、土台そのものの枠は3つとも崩れる

| Dialog の中で                    | Select（基準）                                                   | React Aria             | Ariakit                | Downshift              | Ariakit＋Radix の枠                  | Downshift＋Radix の枠                |
| -------------------------------- | ---------------------------------------------------------------- | ---------------------- | ---------------------- | ---------------------- | ------------------------------------ | ------------------------------------ |
| Esc の1回目                      | 一覧だけ閉じる                                                   | × ダイアログごと閉じる | × ダイアログごと閉じる | × ダイアログごと閉じる | 一覧だけ閉じる                       | 一覧だけ閉じる                       |
| Esc の2回目                      | ダイアログが閉じ、開いたボタンへ戻る                             | —（1回目で閉じている） | —                      | —                      | ダイアログが閉じ、開いたボタンへ戻る | ダイアログが閉じ、開いたボタンへ戻る |
| 一覧の外（ダイアログの中）を押す | 一覧だけ閉じる                                                   | 一覧だけ閉じる         | 一覧だけ閉じる         | 一覧だけ閉じる         | 一覧だけ閉じる                       | 一覧だけ閉じる                       |
| 候補をポインターで選ぶ           | × 幕の下で押せない（[10](#10-試作で見つかった今の部品の不具合)） | × 押せない             | × 押せない             | × 押せない             | ○                                    | ○                                    |
| Tab                              | 一覧に留まる                                                     | 次へ移る               | × 一覧から出られない   | 次へ移る               | 次へ移る                             | 次へ移る                             |

原因は、Radix の Dialog が次のことをするためです。どの土台でも同じに起きます。

- **Esc を document の capture で受ける。** 内側の部品より先に受けるので、Radix の仲間（DismissableLayer の重なり）でない一覧が開いていても、ダイアログが閉じる。
- **body に `pointer-events: none` を付け、ダイアログの外を `aria-hidden` にする。** body の直下に出した一覧は、押せず、読み上げからも隠れる。
- **フォーカスをダイアログの中に閉じ込める。** Ariakit は候補に一瞬だけ本物のフォーカスを移すので、閉じ込めとぶつかって Tab で出られなくなった。

一覧の枠を Radix の Popover にすると、Radix が重なりを1つの積み重ねとして扱うので、すべて Select と同じになりました（Esc は上の重なりから順に閉じる、ポインターは一番上の重なりに届く、外側の判定も重なりを知っている）。Ariakit と Downshift は、開閉の状態を自分で持てるので、枠だけを差し替えられます。

React Aria は差し替えられませんでした。React Aria の ComboBox は、開くときに一瞬だけ候補へフォーカスを移し、入力欄の blur で「フォーカスが自前の Popover の外へ出たか」を見て閉じます。Radix の枠には React Aria の Popover がないので、開いた直後に閉じます。揃えるには、KEI の Dialog の側で React Aria の重なりを特別に扱う（Esc・外側の判定・`pointer-events`・`aria-hidden`）か、react-aria の hooks（`useComboBox`）から組み直す必要があります。React Aria の DatePicker のカレンダーも、同じ問題を持ちます。

### 画面の上での違い

| 画面の上で            | Select（基準）                 | React Aria                                     | Ariakit（＋Radix）      | Downshift（＋Radix）   |
| --------------------- | ------------------------------ | ---------------------------------------------- | ----------------------- | ---------------------- |
| 最初の矢印            | 開いて先頭を選びかけ           | 同じ                                           | 開くだけ（2回目で先頭） | 同じ                   |
| Home / End            | 先頭・末尾へ                   | × 先頭・末尾へ移るが、画面が動いて一覧が閉じる | 入力欄の行頭・行末      | 先頭・末尾へ           |
| Esc の1回目           | 閉じる                         | 閉じて、入力を選んだ値に戻す                   | 閉じる（文字は残す）    | 閉じる（文字は残す）   |
| Esc の2回目           | —                              | —                                              | —                       | 文字を消す             |
| Tab                   | 一覧に留まる                   | 選びかけを確定して次へ                         | 確定せずに次へ          | 選びかけを確定して次へ |
| 外側を押す            | 閉じる（押した物には届かない） | 閉じて、押した物にも届く                       | 同じ                    | 同じ                   |
| PortalSurface・テーマ | ○                              | ○                                              | ○                       | ○                      |

- Select は「選ぶだけ」のモーダルな一覧で、Combobox は入力欄にフォーカスを残す一覧です。外側を押したときの押した物への届き方と、Tab の扱いは、Combobox では Radix の Popover と同じ（押した物にも届く、Tab で次へ）にします。ARIA の Combobox の型（APG）も同じです。
- Downshift の Esc（1回目は閉じる、2回目は文字を消す）は APG と同じです。React Aria の「入力を戻す」と Ariakit の「何もしない」は、KEI の層で揃える必要があります。
- React Aria の Home / End は、末尾・先頭の候補へ移ったあと画面が少しスクロールし（試作では 16px）、React Aria の「スクロールしたら閉じる」で一覧が閉じました。既定の動きを止めていないためと見られます。ダイアログの中（スクロールが止まっている）では起きません。

## 4. IME の扱い

KEI の層で、次の守りを入れました（`useImeGuard`）。3つの土台とも、守りがあればすべての確認に通りました。

- 絞り込みは確定した文字でだけ行う。変換中の文字は入力欄に出すが、候補は変えない。
- 変換中のキー（`isComposing`、または `keyCode` が 229）は、土台に渡さない。Chrome は確定の Enter を `isComposing=true` で送り、Safari は `compositionend` のあとに `isComposing=false`・`keyCode=229` の Enter を送るので、両方を見る。
- Radix の枠の Esc も、変換中は閉じない（Radix は `isComposing` を見ないため）。

守りを外して、土台そのものの扱いも見ました（合成のイベントで、Chrome の順と Safari の順を両方のエンジンで再現）。

| 守りなしで                             | React Aria             | Ariakit | Downshift |
| -------------------------------------- | ---------------------- | ------- | --------- |
| 変換中に絞り込まない                   | ×                      | ×       | ×         |
| 変換中の矢印で候補が動かない           | ○                      | ○       | ×         |
| 確定の Enter で選ばない（Chrome の順） | ○                      | ○       | ○         |
| 確定の Enter で選ばない（Safari の順） | × 入力した文字が消える | ○       | ○         |
| 変換中の Esc で一覧を閉じない          | ○                      | ×       | ×         |

- どの土台も変換中に絞り込むので、守りは土台によらず KEI の層で要ります。
- React Aria と Ariakit は `isComposing` を見ますが、`keyCode` 229 は見ません。React Aria は Safari の順で、確定の Enter を「候補を選ばずに確定」と受け取り、入力した文字を消しました。
- Downshift は変換中かどうかを何も見ません。守りで補います。

Chromium の IME の経路（CDP の `Input.imeSetComposition`。イベントはブラウザ自身が出す）でも確かめました（[spikes/combobox/test/ime-cdp.md](../spikes/combobox/test/ime-cdp.md)）。ここで Downshift の注意点が1つ見つかりました。**`inputValue` を外から制御すると、変換中の値の書き戻しが1回遅れて変換の範囲が崩れ、入力欄が「ととうとうきょう東京」のように重なります。** `inputValue` を Downshift に持たせ、絞り込みの文字は `onInputValueChange` で受け取る形にすると直りました。KEI の部品ではこの形に決め、Chromium の IME の経路の検査で止めます。

OS の日本語入力を使った手での確認は、この試作ではしていません（[9](#9-残っている確認)）。

## 5. 読み上げ

| 確かめる点                             | React Aria                                                        | Ariakit（＋Radix） | Downshift（＋Radix） |
| -------------------------------------- | ----------------------------------------------------------------- | ------------------ | -------------------- |
| 名前・補助文・エラーが入力欄に結ばれる | ○                                                                 | ○                  | ○                    |
| 今の候補（`aria-activedescendant`）    | ○                                                                 | ○                  | ○                    |
| 選んだ候補の `aria-selected`           | ○                                                                 | ○                  | ○                    |
| 候補の数の読み上げ（live region）      | ○「1 個のオプションを利用できます。」                             | × なし             | × なし               |
| axe の指摘（一覧を開いた状態）         | `aria-hidden-focus`（一覧の外を隠すが、外の欄にフォーカスが届く） | なし               | なし                 |

- 候補の数を読み上げるのは React Aria だけでした。Ariakit・Downshift では、KEI の層で live region（「3件の候補があります」など）を足します。
- React Aria と Select は、開いている間、一覧の外を `aria-hidden` にします。Combobox は入力欄にフォーカスを残す部品なので、外を隠さない（Radix の Popover の非モーダルと同じ）ほうが合います。
- VoiceOver での確認はしていません（[9](#9-残っている確認)）。

## 6. DatePicker に広げられるか

### React Aria

DatePicker・DateRangePicker・Calendar を持ち、`@internationalized/date` の暦に対応しています。試作（`spikes/combobox/src/AriaDatePicker.tsx`）では、locale を `ja-JP-u-ca-japanese` にすると年号で入力・表示でき、カレンダーで 2019年4月30日の翌日を選ぶと「H31/4/30」が「R1/5/1」に変わり、値は ISO の暦の `2019-05-01` のまま持てました。年号は略記（H・R）で出るので、「平成」「令和」と出すには年号の区切りの表示を差し替える工夫が要ります。

ただし、カレンダーのポップアップは React Aria の重なりなので、[3](#3-操作を-selectdialog-と揃えられるか) と同じく Radix の Dialog の中で崩れます。期間の絞り込みは Dialog やドロワーの中で使うことが多いので、そのままでは使えません。

### Downshift（採る案）と Ariakit

どちらも日付の部品を持たないので、次を作ります。暦の計算と和暦は `@internationalized/date`（+5KB、Apache-2.0、React Aria と同じ作り手）に任せ、React Aria の部品は使いません。

| 作るもの         | 内容                                                                                                                                                                                                 | 土台                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 年月日の直接入力 | 年・月・日の3つの入力欄を Field で組む（GOV.UK の日付の入力と同じ型）。和暦は年号の Select と年の欄。全角の数字は Combobox と同じ正規化で受ける。区切りごとに動く入力（spinbutton の並び）は作らない | Field・TextField・Select                                      |
| 日付の検証と変換 | 存在する日か、和暦の年号の範囲（平成31年4月30日まで、令和元年5月1日から）、ISO との行き来                                                                                                            | `@internationalized/date`（`JapaneseCalendar`・`toCalendar`） |
| カレンダー       | APG の「日付選択のダイアログ」の表（矢印・PageUp / PageDown で月・Shift と合わせて年・Home / End で週の端）。今日・選択中の印、曜日の見出し                                                          | Radix の Popover（重なり）と、表は自作                        |
| 期間             | 開始日と終了日の2つの入力と、カレンダーでの範囲の表示。開始が終了より後にならない検証                                                                                                                | 自作                                                          |
| 和暦の表示       | `Intl.DateTimeFormat('ja-JP-u-ca-japanese', { era: 'long' })` で「令和元年5月1日」と出せる                                                                                                           | 標準の Intl                                                   |
| 祝日             | どの土台にもない。データ（内閣府の祝日の CSV など）と、色だけにしない印                                                                                                                              | 自作                                                          |

カレンダーの表のキーボード操作は自作になるので、Combobox と同じく、操作の検査（`test/behavior.mjs` と同じ形）を先に書いてから作ります。作ってみて表の自作が重すぎた場合の逃げ道は、react-aria の hooks（`useCalendar`・`useCalendarGrid`）だけを Radix の Popover の中で使うことです。その時は、もう一度大きさと重なりを測ってから決めます。

## 7. 採らなかった案と理由

### React Aria

- 有力だった点：Combobox と DatePicker の両方を持ち、和暦・日本語の読み上げの文言・`isComposing` の扱いまでそろっている。保守も活発（Adobe、react-aria-components は過去12か月で12回の公開）。
- 採らない理由：
  - 自前の重なりの仕組み（Popover・FocusScope・外を `aria-hidden` にする）を持ち、Radix の Dialog の中で Esc がダイアログを閉じ、候補をポインターで押せない。部品の単位では枠を Radix に差し替えられない（[3](#3-操作を-selectdialog-と揃えられるか)）。揃えるには Dialog などの Radix の部品の側を React Aria に合わせて直すことになり、「すでに radix-ui にある部品を置き換えない」「範囲を限る」に反する。
  - いちばん大きい（ComboBox で +69KB、DatePicker と合わせて日本語だけでも +103KB。今の KEI のライブラリは 60KB）。
  - Home / End で画面が動いて閉じる、Safari の順の確定の Enter で入力が消えるなど、KEI の層で直す点が残る。

### Ariakit

- 有力だった点：Radix の枠に差し替えられ、Dialog の中でも Select と同じに動いた。IME の扱いが3つの中でいちばんよい（守りなしでも確定の Enter で選ばない）。保守がいちばん活発（過去12か月で23回の公開）。
- 採らない理由：
  - 同じ機能で Downshift の約4倍（+43KB）。日付の部品はないので、DatePicker のための得もない。
  - 版がまだ 0.x で、API が変わりうる。
  - 候補に一瞬だけ本物のフォーカスを移す作りで、Radix はそれを「外へ出た」と見る。枠の側で DOM の包含を確かめ直す工夫が要った。土台そのものの枠では、Dialog の中で Tab で出られなくなった。
  - Home / End が入力欄の行頭・行末で、最初の矢印は開くだけ。Select と動きが違う（APG では許されている）。

### Downshift を採る理由と、引き受けること

- 採る理由：いちばん小さく（+9KB）、状態・キーボード・ARIA だけを持つので、重なりは全部 Radix に任せられる。Select と同じ DismissableLayer に乗るので、操作の統一感が作りの上で保たれる。キーボードの動きも Select にいちばん近い。MIT、React 19 に対応（peer は `react >=16.12.0`）。
- 引き受けること：
  - IME は何も見ないので、KEI の層の守り（[4](#4-ime-の扱い)）が要る。守りはどの土台でも要るので、余分の手間ではない。
  - `inputValue` を制御しない形に決める（制御すると変換が崩れる）。
  - 候補の数の読み上げ（live region）を KEI の層で足す。
  - 開発の速さは3つの中でいちばん遅い（過去6か月のコミットは9件、最後の公開は 2026年6月30日の 9.4.0）。成熟して API が落ち着いているとも言える。prop-types など古い依存が付いてくる（本番のビルドでは小さい）。
  - 位置合わせは Radix の Popover に任せるので、floating-ui を直接の依存にしない。

## 8. KEI に入れるときの作り

試作の `shared.tsx` を、次の形で本体に入れます。

- **Combobox の部品**：Downshift の `useCombobox` ＋ Radix の Popover（`RadixShell`）。props は Select・Field と同じ形。土台の型は外に出さない。
- **正規化**：`normalize`（NFKC → カタカナをひらがな → 小文字 → 空白を除く）を関数として書き出し、Format や検索欄でも使う。候補には読み（`kana`）を持たせられるようにする。
- **IME の守り**：`useImeGuard` を、Combobox のほか、SearchField・DatePicker の年月日の欄にも使う。
- **枠の約束**：入力欄にフォーカスを残す部品の枠は、Radix の Popover に次を付ける。開閉でフォーカスを動かさない（`onOpenAutoFocus`・`onCloseAutoFocus` を止める）、入力欄と一覧の中は「外側」にしない、変換中の Esc では閉じない。
- **見た目**：一覧は Select と同じ値（`.k-select-content`・`.k-select-item`）。z-index は Dialog の上（試作では 110）にする。今の候補の印は、試作では土台ごとに属性の名前が違った（`data-focused`・`data-active-item`・`data-highlighted`）ので、KEI の部品では `data-highlighted` に揃える。
- **共通の操作の検査**：`test/behavior.mjs` の操作（矢印・Home / End・Enter・Esc・Tab・外側を押す・ポインターで選ぶ・Dialog の中・IME の2つの順・テーマ）を、`packages/react/src/test` の検査として、開閉する部品（Select・Combobox・DatePicker・DropdownMenu・Popover）に共通に流す。土台の違う部品でも同じ検査を通すことが、約束の「検査で確かめる」になる。

## 9. 残っている確認

この試作で確かめられなかったことです。Combobox を本体に入れる PR で確かめます。

- **OS の日本語入力での手の確認。** macOS の Chrome と Safari で、ことえり（日本語入力）と Google 日本語入力を使い、「とうきょう」を変換して Enter で確定する、変換中に矢印で変換の候補を選ぶ、変換中に Esc で取り消す、を確かめる。試作の検査は、合成のイベント（両方のエンジン）と Chromium の IME の経路だけです。特に Safari で、変換中の Esc が `key='Escape'` で来るかどうか（来るなら、今の Dialog の中の TextField でも、取り消しでダイアログが閉じる。[10](#10-試作で見つかった今の部品の不具合)）。
- **VoiceOver での確認。** Safari と Chrome で、入力欄の名前・補助文・エラー、今の候補、選んだ値、候補の数（足す live region）が読まれるか。
- **Firefox。** 試作では流していない。

## 10. 試作で見つかった今の部品の不具合

試作の検査で、今の部品について2つ見つかりました。この作業では直していません。

1. **Dialog の中の Select の候補を、ポインターで押せない。** `.k-select-content` の z-index（80）が、Dialog の幕（`.k-dialog-overlay` の 100）と本体（101）より下にあるため、一覧が幕の下に出ます（Chromium・WebKit とも。キーボードでは選べる）。Tooltip（90）も同じ段にあります。重なりの段（z-index）を、Dialog の中に出る物が上に来るように決め直す必要があります。
2. **Radix の Esc は変換中かどうかを見ない（要実機確認）。** Radix は document の capture で `key === 'Escape'` だけを見ます。変換の取り消しの Esc がこの形で来るブラウザでは、Dialog の中の入力欄で変換を取り消しただけで、ダイアログが閉じます。Dialog の `onEscapeKeyDown` で `isComposing` と `keyCode` 229 を見て止めれば直ります。

## 試作のためにダウンロードしたもの

すべて `spikes/combobox` の中だけに入れ、本体の `package.json` には足していません。

| パッケージ                          | 版     | ライセンス               | 入手元                                             | 使い道                                |
| ----------------------------------- | ------ | ------------------------ | -------------------------------------------------- | ------------------------------------- |
| react-aria-components               | 1.22.1 | Apache-2.0               | npm（github.com/adobe/react-spectrum）             | 試作                                  |
| @ariakit/react                      | 0.4.42 | MIT                      | npm（github.com/ariakit/ariakit）                  | 試作                                  |
| downshift                           | 9.4.0  | MIT                      | npm（github.com/downshift-js/downshift）           | 試作                                  |
| @internationalized/date             | 3.12.4 | Apache-2.0               | npm（github.com/adobe/react-spectrum）             | 和暦の試作                            |
| @floating-ui/react-dom              | 2.1.9  | MIT                      | npm（github.com/floating-ui/floating-ui）          | Downshift の自前の枠                  |
| @react-aria/optimize-locales-plugin | 2.1.0  | Apache-2.0（リポジトリ） | npm（github.com/adobe/react-spectrum）             | React Aria の大きさを日本語だけで測る |
| playwright                          | 1.56.1 | Apache-2.0               | npm                                                | 検査                                  |
| axe-core                            | 4.11.0 | MPL-2.0                  | npm                                                | 検査                                  |
| Playwright の WebKit（build 2215）  | 26.0   | —                        | Playwright の配布元（`playwright install webkit`） | 検査                                  |

これらの依存の依存（react-aria・react-stately・@ariakit の各パッケージ・prop-types など）も含め、入れたものは全部 `spikes/combobox/package-lock.json` にあります（47 件。検査用の playwright なども含む）。
