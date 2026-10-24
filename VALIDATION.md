# 検証記録 · 2026-10-24

## 実行結果

- `npm run typecheck`：成功。
- `npm test`：**167 / 167 成功**。114 Storyの描画とplay関数、16件の入力・フォーカス・テーブル・画面フロー・axe検査、37件の意味色コントラストとトークン同期の検証。
- `npm run build`：ライブラリ（JS / CSS / 型定義）、画面デモ、静的Storybookのビルド成功。
- Storybookの生成インデックス：**114 Stories / 29 Docs**。部品25群、Foundations、Workspace、Application、導入ドキュメント。
- `npm pack`：再利用用パッケージ `kei-design-react-0.1.0.tgz` を作成。JS・CSS・型定義・トークン・導入と設計文書を同梱。

## Codex内のブラウザで確認した内容

- Storybookのナビゲーション、導入文書、部品のControls、画面パターン。
- ButtonのラベルをControlsで変更し、プレビューが更新されること。
- 作業の新規作成：必須エラー → 名前とメモ入力 → 追加 → 一覧反映 → 検索 → 詳細に入力メモが表示。
- ダイアログをEscapeで閉じること。Inkテーマがダイアログへ引き継がれること。
- Paper / Inkと、標準 / 高密度の切り替え。
- 320pxのSmall mobileでレイアウトを確認。狭い幅では指標を1列、検索と状態フィルターを縦に配置し、テーブルは横スクロールで情報を維持。
- 作業モニターのブラウザ内Accessibility検査：Paper / Inkの両方で**違反0**。各検査で36 Passes / 2 Inconclusiveを表示。最終版のPaper高密度でも違反0を確認。
- 全体デモの初期画面と、計器モチーフの表示。

## 検証の範囲

jsdomのaxe検査ではレイアウトによるコントラスト計測ができないため、色の検査を別途37件の数値チェックと実ブラウザで実施。jsdomの未実装APIはテスト用に補完し、ポータル位置・実際のレイアウトはブラウザで確認。

AccessibilityのInconclusiveは自動判定が完了しなかった項目で、すべてのアクセシビリティ要件が合格したことを意味しない。全Storyの実ブラウザ自動検査、スクリーンリーダー、全実機・全ブラウザ、バックエンド接続、本番データでの検証は未実施。

Storybookの静的ビルドには500kB超のドキュメント・検査ツールのチャンク警告が残る。ライブラリ本体は約223kB（gzip約60kB）、CSS約17kB。型抽出が不要な`.storybook/preview.tsx`についてdocgenスキップ警告が出るが、部品のAPIドキュメントとビルドは生成済み。

## 起動中のローカルサーバー

- Storybook：http://127.0.0.1:6006/
- デモ：http://127.0.0.1:5173/

両方とも127.0.0.1限定。再起動はREADMEの`npm run storybook` / `npm run dev`を使う。ホストのセッション終了時には停止する可能性がある。画面例の追加・設定はメモリ内で、再読み込みすると初期値に戻る。

## 青系カラースキームへの更新

ユーザーの希望に合わせ、Paperを青灰色、Inkをネイビー、主要操作をコバルトへ変更。Sidebar・計器・Storybookの外枠・設計文書・JSONトークンへ反映。167テストと3種類のビルドを再実行し成功。ブラウザの作業モニターでPaper / Inkの各テーマを再検査し、違反0 / 36 Passes / 2 Inconclusive。

## ウルトラマリンへの再調整

強い青の参考3件を画像で再確認し、主要色を#2424D8に変更。サイドバー・計器面へ青い色面を拡大。ライブラリの167テストと全ビルドが成功。青いサイドバーには白のフォーカスリングを設定。

## フラットな面への統一

- ボタン上部の白いハイライト、カード・計器・入力・スイッチ・オーバーレイの影を撤去。Paper / Ink とも影トークンは none。面色と境界線で階層を示す。
- 角丸トークンを 2 / 3 / 6px に統一し、Kbd の下辺を1pxに変更。操作時のフォーカス輪郭は維持。
- `npm test`：167 / 167 成功。`npm run build`：ライブラリ・デモ・静的Storybookの生成成功。
- ブラウザでボタン・カード・入力の computed box-shadow が none であることと、コンポーネント一覧の見た目を確認。ソースCSS内の全 box-shadow 宣言が none であることも確認。
- 確認画像：screenshots/flat-components.png。

## Paper / Ink 状態点検

- 両テーマでブラウザ上のボタン、Badge、入力、エラー、Checkbox、SwitchのON/OFF、選択メニュー、ダイアログ、通知、計器、読み込み、空状態を確認。キーボードでダイアログ内のフォーカス表示・切替・Escape復帰を確認。ホバー・選択・disabledのスタイルもソースで点検。
- 修正：入力・Secondary操作の輪郭をstrongに、OFFのつまみを判別可能な色に変更。無効・処理中の文字を不透明で読みやすくし、エラー入力のfocus時も赤い境界を維持。Selectの現在位置を明確化し、選択した表の行がhoverで通常色へ戻らないよう修正。
- 暗幕をテーマ別の青系に、ネイティブスクロールバーをテーマ追従に変更。InkのSkeletonが黒い穴に見えないよう専用色に変更。影・ハイライトは追加していない。
- `npm test`：179 / 179 成功。各テーマの操作境界3:1、primary hover・danger文字4.5:1、ONのつまみ3:1を追加検査。`npm run build`：型・ライブラリ・デモ・静的Storybook成功。
- 証跡：screenshots/audit-light-components.png、audit-dark-components.png、audit-light-dialog.png、audit-dark-dialog.png。
- 全Storyの全状態を実ブラウザで網羅した検査ではない。自動テスト・トークン検査と代表的な画面状態の目視点検を組み合わせた。

## 配色バランス・WCAG 2.2 対照

通常文字は4.5:1、大きい文字は3:1、操作や状態の識別に必要な非テキスト表示は隣接色に対して3:1を下限に検査する。大きい文字は通常24 CSS px以上、太字は約18.67px以上を目安とする。装飾の区切り線や非操作状態すべてに3:1を要求するわけではない。前後のhover色同士に3:1を要求するものでもない。背景面の面積・彩度に唯一の最適比率を定めるWCAG基準はない。

公式資料：
- https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html

| 対象 | Paper | Ink | 採用下限 |
|---|---:|---:|---:|
| 本文 / ページ背景 | 14.06:1 | 16.22:1 | 4.5:1 |
| 補助文字 / カード面 | 6.71:1 | 8.93:1 | 4.5:1 |
| 主要ボタン文字 / 塗り | 9.06:1 | 9.08:1 | 4.5:1 |
| 操作境界 / 入力内側面 | 3.90:1 | 4.07:1 | 3:1 |

値は表示用に丸めたもの。テスト判定は丸め前で実行する。意味色文字を通常面へ直接配置した場合、メニュー選択、表の選択、全主要面上のfocus、OFFのつまみも検査対象に追加した。

視覚的な調整として、Inkのサイドバーを#191953、計器の広い青面を#252578に変更。ライトの鋭いウルトラマリンは維持し、ダークでは大きな面の輝度・彩度と模様の密度を抑え、小さな操作と本文に注意が向くようにした。これは知覚上のデザイン判断であり、WCAG違反の修正ではない。

ブラウザの実computed色の検査では、概要182・部品126の不透明な文字サンプルをテーマごとに集計し、閾値未満0。詳細はcolor-browser-audit.json。背景模様、SVG、placeholder、入力内部、透過要素、全hover状態はこの簡易集計の対象外で、トークンテストと先の代表状態点検で補う。WCAG全体への適合宣言ではない。

`npm test`：227 / 227 成功。型・ライブラリ・デモ・静的Storybookのビルド成功。比較画像はscreenshots/balance-light.png、balance-dark.png。

## 文字サイズ・余白・情報密度の点検

従来の8〜11pxの補助・表・ナビゲーション文字、装飾計器の5〜7px文字を見直し、本文・表・入力・通常操作14px、ラベル13px、補助12pxを基本に変更。これは業務画面としての設計判断であり、WCAGが14pxを一律要求しているわけではない。指定をremへ移行。

標準／高密度の実ブラウザ測定（root16px、PaperとInk、画面パターン）：
- 表の文字：両方14px。二段表示の行高：約71.39px／63.39px。
- 入力：両方14px、操作高40px／32px。セル上下12px／8px、パネル内20px／16px。
- 画面内の直接文字ノードの最小サイズ12px。全体の横はみ出しなし。比較表は内部スクロール。
- Checkbox・表の選択操作を24px、Switchを40×24pxへ拡大。表ソートや小操作にも24px以上の領域を確保。粗いポインターでは主要操作44px高。WCAG 2.5.8には24×24pxまたは間隔などの例外規定があるが、今回の単独操作は領域自体を広げた。

Storybookに密度比較と幅320pxの文字間隔拡大（行高1.5、文字間隔.12em、単語間隔.16em、段落後2em）を追加。320pxの領域に318pxの表枠、内部707pxの表を収め、ページ全体の横はみ出しなしをブラウザで確認。追加シナリオのAccessibilityはViolations 0 / Passes 36 / Inconclusive 2であり、未判定を合格扱いしていない。実際の200%ブラウザ／文字ズームと全実機は未検証。

公式資料：
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html
- https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html

`npm test`：229 / 229。型・ライブラリ・デモ・静的Storybookビルド成功。ブラウザ計測はtype-density-audit.json。画像はscreenshots/density-comparison.png、type-spacing-320.png。

## 汎用デザインシステムへの再構成

- 構成を共通トークン → 汎用部品／レイアウト → 用途別パターンに整理。Text / Heading / Link / ActionLink / Container / Stack / Grid / RadioGroupを追加し、各APIのAutodocsと状態・使用例を追加。
- 標準本文16px、interface本文14pxを密度と独立して指定可能。入れ子Providerは未指定のテーマ・密度・文字設定を引き継ぐ。ダイアログ等のポータルにも反映。既存の管理パターンは明示的にinterfaceを使用する。
- Dialogの業務用eyebrowとEmptyStateのNO RECORDS固定表示を撤去。任意のeyebrowへ変更。一般向けTextFieldはcontrolSize=lgで16px・48px高、Button / ActionLinkもlgで16px・48px高。移動と実行をa / buttonで区別。
- 検索一覧（カテゴリ・キーワード・0件からリセット・記事へ移動）、記事詳細（本文・保存切替・アンカーリンク）、登録（エラー・入力・確認・修正・完了・リセット）を追加。デモの画面パターンにも探す／読む／申し込む／管理するを用意。データはローカル状態のみ。
- ブラウザで検索→0件→リセット→記事への遷移と見出しフォーカス、登録エラー→入力→確認→修正時の値保持→完了を確認。Paper一覧・Ink記事・Ink登録を目視確認。本文と一般向け入力は実computed値16px。
- 320pxの一覧と登録領域でページ全体の横はみ出しなし。別途、既存の管理画面・密度のテストを維持。
- Storybookの登録初期Story：Accessibility Violations 0 / Passes 25 / Inconclusive 0。ただし全Storyの全状態を実ブラウザで自動検査したものではなく、WCAG全体適合の保証ではない。実際の200%ブラウザズームは未検証。
- `npm test`：270 / 270 成功。147から148に増えたStoryを含む描画・play、入力・フォーカス・画面フロー、両テーマの構造axe、トークンとコントラスト検査。
- `npm run build`：型・ライブラリ・デモ・静的Storybook成功。最終インデックスは148 Stories / 39 Docs。
- 画像：screenshots/universal-library-light.png、universal-article-dark.png、universal-registration-dark.png、universal-storybook.png。

## 追加画面の両テーマ・スマホViewport点検

通常幅で一覧・記事・登録のPaper / Inkを点検し、Storybookの実Viewport 320px / 414pxでも3画面×両テーマを比較。従来の固定320pxコンテナだけの点検とは別に、メディアクエリが切り替わる幅そのもので確認した。

修正内容：
- EverydayのStoryをfullscreenにし、余白を一箇所へ統一。通常32px・スマホ16px。本文・入力16pxは維持し、スマホでは導入文18px、一覧の導入文16pxと見出し28pxを採用。区切り間隔は24px、一覧は20px。引用の余白と大きさも縮めた。
- 360px以下ではカテゴリを2列に整理。スマホのボタンは44px以上、入力は48px高。
- 例示した見出しは語句の区切りで改行できるようにし、動詞の途中や末尾だけが次行に残る状態を修正。
- 登録の不備がある最初の入力／確認チェックへフォーカスし、ラベル・補助文も含む領域をスクロールして表示。チェックボックスにerrorの関連付けを追加。長いメールアドレスは確認画面で折り返す。
- 記事から戻ると元の一覧ボタンへフォーカスを戻す。
- デモのモバイルナビゲーションは閉じた状態の操作項目を非表示にし、開いた際のフォーカス移動、Tab循環、Escapeで閉じてトリガーへ復帰、画面例への遷移を実ブラウザで確認。

計測と範囲：
- 通常幅の実computed色で不透明な文字130サンプルを確認。閾値未満0、最小6.2045:1。入力値・placeholder・SVG・透過・装飾はこの集計から除き、既存のトークン検査と代表状態の目視点検で補った。本文と入力の実測は16px。
- 320pxの登録で未入力→入力フォーカス、確認チェックだけの不備→チェックと説明が表示、長いメールを含む確認→完了を実操作。長い文字は確認欄で折り返し、ボタンも横にはみ出さず収まる。
- 詳細はeveryday-responsive-audit.json。スクリーンショットはscreenshots/phone-*.png、phone414-*.png。
- `npm test`：273 / 273成功。型・ライブラリ・デモ・静的Storybookのビルド成功。
- 実機のタッチ／仮想キーボード、OS文字設定、全ブラウザ、200%ズームは未検証。WCAG全体への適合宣言ではない。
