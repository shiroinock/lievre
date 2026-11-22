# 配置の品質基準

部品を追加・変更するときに満たす、配置の基準です。どれも数値で測れる形にしてあり、CI で検査します。

- **実際の描画で測るもの**：`npm run test:layout`（`packages/react/src/test/layout`）。Vitest のブラウザモードと Playwright の Chromium で、すべての Story を描画して測ります。
- **CSS から静的に分かるもの**：`npm run lint`（`packages/react/scripts/stylelint-lievre.mjs`）。

基準の値は `packages/react/src/test/layout/declare.ts` の `CRITERIA` が正です。この文書と食い違ったら、どちらかを直してください。

## 基準

### 描画で測る

| 検査（`checks` に書く名前） | 基準                                                                                                                                                                                               | 許容差          |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `inset-x` 左右の中央        | 中央揃えの部品で、中のインク（文字の輪郭とアイコン）の左右の余白が等しい。左右の差の半分（dx）を測る。                                                                                             | 0.8px           |
| `inset-y` 上下の中央        | 中身の上下の余白が等しい。文字は墨ではなく日本語の字面の枠（ベースラインの 0.38em 上を中心にした 1em の枠）で、アイコンはその箱で測る。上下の差の半分（dy）を測る。                                | 0.8px           |
| `{ icon }` アイコンと文字   | アイコン・チェックボックス・ラジオ・スイッチの縦の中心が、隣の文字の1行目の行ボックスの中心にある。`block: true` なら文字のまとまりの中心（Card の見出しの操作）。                                 | 0.8px           |
| `control-height` 操作の高さ | 高さが 24 / 32 / 40 / 48px のどれか（タッチの画面は 44px）。                                                                                                                                       | 0.8px           |
| `grid-height` 高さの格子    | 高さが 4px の倍数。                                                                                                                                                                                | 0.8px           |
| `square` 正方形             | 幅と高さが同じ（アイコンだけのボタン）。padding ではなく width と height で大きさを決める。                                                                                                        | 0.8px           |
| `focus-room` 輪郭の余地     | フォーカスの輪郭（2px の線と 2px の隙間）が、はみ出しを切る親（overflow が visible でない要素）の内側に収まる。                                                                                    | 0.8px           |
| `{ padding }` 内側の余白    | 左右の padding が、ボタンは高さ×0.4、入力欄は高さ×0.3 を 4px に丸めた値（40→16 / 12、32→12 / 8、48→20 / 16px）。                                                                                   | 0.8px           |
| `padding-equal` パネル      | Card・Alert・Toast・Dialog などのパネルの padding が上下左右で同じ。                                                                                                                               | 0.8px           |
| `action-band` 操作の帯      | 罫線で区切った操作の帯（Dialog の下）の padding が上下16px、左右は直前の区画（本文）と同じ。                                                                                                       | 0.8px           |
| `{ sameHeight }` 並び       | 1行に並べた部品（入力欄・選択の欄・ボタンなど）の高さが揃う。                                                                                                                                      | 0.8px           |
| `fits` はみ出し             | 横に `scrollWidth > clientWidth` にならない。はみ出しを切る要素（overflow が visible でない）は縦も見る。                                                                                          | 0               |
| `fills-x` 中身の広がり      | svg の線や図形など描いた中身が、箱の左右いっぱいに広がっている（Sparkline が viewBox の縦横比で縮まない）。                                                                                        | 2px（線の太さ） |
| `{ baseline }` ベースライン | 同じ行に並んだ文字（ラベルと値など）のベースラインがそろう。大きさや書体が違う文字を flex で並べるときは `align-items: baseline`。                                                                 | 0.8px           |
| `line-grid` 行の箱の格子    | 文字の行の箱の高さ（padding と枠線を除いた高さ）が 4px の倍数。line-height を 4px に丸めていない場合と、等幅の数字と単位など書体や大きさの違う文字が同じ行に混ざって行の箱が広がる場合を見つける。 | 0.1px           |

上下を字面の枠で測るのは、書体の上寄りと字形の違いを分けるためです。Lievre Sans と Lievre Mono は、日本語の字面の枠を行の箱の中央に置きます（DESIGN.md の「書体」）。字面の枠がずれていれば、padding か行の高さの誤りか、補正のない書体（`@lievre/react/fonts.css` を読み込んでいない、`'IBM Plex Sans JP'` を直に指定した）です。補正のない Plex Sans JP では字面の枠が 0.07em（14px で 1px）上に寄ります。書体の補正そのものは `fonts.layout.tsx` が、本文と等幅の書体を 400・500・600 で読み込み、行の中央がベースラインの 0.38em 上にあり行の箱の高さが変わっていないことを 0.01em まで確かめます。部品の検査の許容差 0.8px は、ブラウザが字の ascent・descent と半行送りを整数 px に丸める分です（14.4px の等幅に `line-height: 1` を当てた Stepper の円や Calendar の日で 0.7〜0.8px）。

墨で測ると、同じ箱でも字形でずれ方が変わります。Lievre Sans で測った墨の上下のずれ（上下の差の半分、負が上）は次のとおりで、英小文字や等幅の英数字は字面の枠より背が低いぶん下に出ます。これは書体の性質として許し、検査しません。

| 書体（400・500・600） | 漢字             | かな             | 英大文字・数字   | 英小文字         |
| --------------------- | ---------------- | ---------------- | ---------------- | ---------------- |
| IBM Plex Sans JP      | −0.076〜−0.078em | −0.074em         | −0.059〜−0.061em | +0.037〜+0.039em |
| Lievre Sans           | −0.004〜−0.008em | −0.002〜−0.004em | +0.010em         | +0.104〜+0.107em |
| Lievre Mono           | −0.002〜−0.006em | 0〜−0.002em      | +0.088〜+0.090em | +0.166em         |

Lievre Mono の英数字が下に出るのは、Plex Mono を 5/6 に縮めて字の背が低くなるためです。日本語と同じ行の中央を使わないと、等幅と本文が混ざった行の箱が広がり（表のセルが 25px になる）、隣り合うセルのベースラインもそろいません。英数字の位置は、字形ごと縦の位置を補正する Lievre Term に置き換えるときに直します。

アイコンは文字の字形ではなく**行ボックス**の中心に合わせます。svg は `height: 1lh`、20px の箱は `margin-top: calc((1lh - 20px) / 2)` で置くと、文字の大きさや行の高さが変わっても揃います。

文字の上下の輪郭は、canvas に字を 256px で描き、画素を読んで求めます（字ごとに覚えておき、文字列はその合わせ）。`measureText` の輪郭は OS で違い、Linux の Chromium は曲線の制御点まで含んだ箱を整数 px に丸めて返すため、14px の字で 0.1〜0.2px 大きく出ます。基準の際にある部品が macOS では通り、CI だけ落ちていました。

### 部品を組み合わせた画面も測る

部品の Story だけでなく、デモ（`packages/react/src/App.tsx`、`Patterns/Application`）と画面例（`packages/react/src/patterns`、`Patterns/Everyday`・`Patterns/Workspace`）も測ります。狭い枠に入れた Meter のはみ出しや、カードいっぱいに伸ばした折れ線など、部品を組み合わせたときにだけ起きるずれがあるためです。測る部品は `packages/react/src/test/layout/screen-parts.ts` の `SCREEN_PARTS` にまとめ、宣言には `screen: '理由'` を付けます。画面では、操作の要素がすべて宣言に入っているかは見ません（それぞれの部品の Story で見ます）。

### 行の箱を 4px に乗せる

line-height は `--lv-line-body` / `--lv-line-tight` で 4px の倍数にしていますが、行の箱が 4px の倍数になるとは限りません。外れる原因は、これまでに次の3つがありました。

- **大きさの違う文字を混ぜる**：Lievre Mono 36px の値に IBM Plex Sans JP 14px の単位を並べると、単位の文字も親の line-height（44px）を px のまま受け継ぎ、書体ごとのベースラインの位置の違いで行の箱が 51px に広がります。混ぜた側（単位）の `line-height` を `1` にして、行の箱を地の文字だけで決めます（Metric・Meter の単位）。同じ大きさの等幅の数字（表の `<span className="lv-mono">` など）は、行の箱を広げません。
- **line-height そのものが 4px に乗っていない**：`1.2` などの倍率は `round(1.2em, 4px)` にします。受け継いだ倍率（本文14px のときの 24 / 14）を 14.4px の等幅の文字に当てると 24.69px になり、ブラウザが半行送りを整数に丸めて中心がずれます。`--lv-line-tight` などのトークンを当てます（Pagination のページ番号）。
- **表の罫線を `border-collapse: collapse` で引く**：罫線が隣り合う行に 0.5px ずつ割り振られ、行の高さが 48.5px・49px になります。lievre の表は `border-collapse: separate; border-spacing: 0` で、各セルが自分の罫線をまるごと持ちます。

行高を上書きする点検用の Story（`parameters.layoutStress`）では、この検査は見ません。

要素どうしの重なり（Meter の読み値と目盛りなど）は、まだ測っていません。目盛りは円の帯を mask で描いているため、要素の矩形の交差では判定できず、帯の内側の半径と読み値の矩形を比べる検査が要ります。

### 測る組み合わせ

すべての Story を次の 8 通りと、等幅の画面の 2 通り（計 10 通り）で描画して測ります。

- 配色：Paper / Ink
- 密度：comfortable / compact
- 文字：standard（本文16px）/ interface（本文14px）
- 等幅の画面（`family="mono"`）：Paper・comfortable・standard と、Ink・compact・interface（14px の本文が 14.4px に引き上がる側）

等幅の範囲と画面そのものは `family.layout.tsx` が確かめます。Card・Text の `mono`、クラス `lv-family-mono`、`family="mono"` の画面で、中の文字がすべて Lievre Mono になり、14.4px（`--lv-text-mono-min`）より小さくならず、行の高さが 4px の倍数で、英数字 12 字と日本語 6 字の幅が 12/64px 以内で同じになること、入れ子が指定しない値を引き継ぎ `family="sans"` で戻せることを見ます。

画面の幅は 1280px、動きを減らす設定（`prefers-reduced-motion: reduce`）で測ります。タッチの画面（`pointer: coarse`）は今は測っていません。

### CSS で静的に検査する

| ルール                    | 基準                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `lievre/spacing-grid`     | 余白の px は 4px の倍数（0 と ±1px、`calc()`・`var()` は対象外）。                                              |
| `lievre/padding-symmetry` | `lievre.components` / `lievre.utilities` の部品で、左右の padding が違う値なら理由のコメントを必須にする。      |
| `lievre/height-grid`      | `height` / `min-height` / `max-height` の px は 4px の倍数。罫線と目印の 1px・2px、`calc()`・`var()` は対象外。 |
| 説明のない無効化          | `stylelint-disable` には必ず `-- 理由` を書く（`reportDescriptionlessDisables`）。                              |

余白（padding・margin・gap と、名前に padding・gap・space を含むカスタムプロパティ）は `lievre/spacing-grid` で 4px の格子に乗せます（0 と ±1px は許可）。

わざと基準を外すときは、その行の直前に理由を書きます。

```css
/* stylelint-disable-next-line lievre/padding-symmetry -- 左の検索アイコンの分を空ける */
padding: 0 12px 0 36px;
```

## 宣言のない部品は通さない

`npm run test:layout` は、配置そのものに加えて次のことも検査します。

1. `packages/react/src/stories` のすべての Story ファイルが、meta の `parameters.layoutGate` に「測る部品」か「測らない理由」を書いている。
2. `packages/react/src/index.ts` から公開している部品（大文字で始まるもの）ごとに、`meta.component` にその部品を指定し、部品を測る Story がある。入れ物だけのもの（`LievreProvider` など）は `packages/react/src/test/layout/baseline.ts` の `NOT_A_PART` に理由付きで書く。
3. 描画したボタン・入力・タブなどの操作の要素が、どれかの部品の宣言に入っている。
4. 宣言した部品が、どれかの Story で実際に描画されている（selector の書き間違いを防ぐ）。

## 既知の例外（ベースライン）

検査を入れた時点で基準を満たしていなかった箇所は、理由を付けて一覧にしています。一覧にある間は CI が通り、消すとその箇所に基準が効きます。

- 描画で測るもの：`packages/react/src/test/layout/baseline.ts` の `BASELINE`
- `lievre/height-grid`：`packages/react/scripts/stylelint-baseline.mjs`

例外は Story の title・部品の名前・検査の名前で照合し、`example`（Story の名前）と `element`（メッセージに出る要素の一部、`「整える」` など）でさらに絞れます。画面の例外は、ずれる要素か Story に絞ってください。部品ごとに外すと、同じ画面で新しく起きたずれも見逃します。

直ったのに一覧に残っている例外は、検査が「もう起きていません」と言って失敗します。一覧は減る方向にしか動きません。新しい部品を例外に足すのは、理由がはっきりしていて、すぐには直せないときだけにしてください。

## 失敗のメッセージ

失敗すると、どの Story・どの組み合わせで、どの部品の、どの部分が、何 px ずれているか、基準は何かを日本語で出します。

```text
[Components/Feedback/Badge › Success｜Paper・標準の密度・本文16px] バッジ（span.lv-badge.lv-tone-success「稼働中」）の高さの格子：高さが 21.2px です。基準：4px の倍数（近いのは 20px か 24px）。
```

部品の名前は `layoutGate.parts` の `name`、括弧の中は実際の要素とその文字です。
