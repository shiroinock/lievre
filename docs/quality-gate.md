# 配置の品質基準

部品を追加・変更するときに満たす、配置の基準です。どれも数値で測れる形にしてあり、CI で検査します。

- **実際の描画で測るもの**：`npm run test:layout`（`src/test/layout`）。Vitest のブラウザモードと Playwright の Chromium で、すべての Story を描画して測ります。
- **CSS から静的に分かるもの**：`npm run lint`（`scripts/stylelint-kei.mjs`）。

基準の値は `src/test/layout/declare.ts` の `CRITERIA` が正です。この文書と食い違ったら、どちらかを直してください。

## 基準

### 描画で測る

| 検査（`checks` に書く名前） | 基準                                                                                                                                                                                               | 許容差                 |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `inset-x` 左右の中央        | 中央揃えの部品で、中のインク（文字の輪郭とアイコン）の左右の余白が等しい。左右の差の半分（dx）を測る。                                                                                             | 0.5px                  |
| `inset-y` 上下の中央        | 中のインクの上下の余白が等しい。上下の差の半分（dy）を測る。                                                                                                                                       | 0.1em（14px で 1.4px） |
| `{ icon }` アイコンと文字   | アイコン・チェックボックス・ラジオ・スイッチの縦の中心が、隣の文字の1行目の行ボックスの中心にある。`block: true` なら文字のまとまりの中心（Card の見出しの操作）。                                 | 0.5px                  |
| `control-height` 操作の高さ | 高さが 24 / 32 / 40 / 48px のどれか（タッチの画面は 44px）。                                                                                                                                       | 0.5px                  |
| `grid-height` 高さの格子    | 高さが 4px の倍数。                                                                                                                                                                                | 0.5px                  |
| `square` 正方形             | 幅と高さが同じ（アイコンだけのボタン）。padding ではなく width と height で大きさを決める。                                                                                                        | 0.5px                  |
| `focus-room` 輪郭の余地     | フォーカスの輪郭（2px の線と 2px の隙間）が、はみ出しを切る親（overflow が visible でない要素）の内側に収まる。                                                                                    | 0.5px                  |
| `{ padding }` 内側の余白    | 左右の padding が、ボタンは高さ×0.4、入力欄は高さ×0.3 を 4px に丸めた値（40→16 / 12、32→12 / 8、48→20 / 16px）。                                                                                   | 0.5px                  |
| `padding-equal` パネル      | Card・Alert・Toast・Dialog などのパネルの padding が上下左右で同じ。                                                                                                                               | 0.5px                  |
| `action-band` 操作の帯      | 罫線で区切った操作の帯（Dialog の下）の padding が上下16px、左右は直前の区画（本文）と同じ。                                                                                                       | 0.5px                  |
| `{ sameHeight }` 並び       | 1行に並べた部品（入力欄・選択の欄・ボタンなど）の高さが揃う。                                                                                                                                      | 0.5px                  |
| `fits` はみ出し             | 横に `scrollWidth > clientWidth` にならない。はみ出しを切る要素（overflow が visible でない）は縦も見る。                                                                                          | 0                      |
| `fills-x` 中身の広がり      | svg の線や図形など描いた中身が、箱の左右いっぱいに広がっている（Sparkline が viewBox の縦横比で縮まない）。                                                                                        | 2px（線の太さ）        |
| `{ baseline }` ベースライン | 同じ行に並んだ文字（ラベルと値など）のベースラインがそろう。大きさや書体が違う文字を flex で並べるときは `align-items: baseline`。                                                                 | 0.5px                  |
| `line-grid` 行の箱の格子    | 文字の行の箱の高さ（padding と枠線を除いた高さ）が 4px の倍数。line-height を 4px に丸めていない場合と、等幅の数字と単位など書体や大きさの違う文字が同じ行に混ざって行の箱が広がる場合を見つける。 | 0.1px                  |

上下の許容差だけ em なのは、IBM Plex Sans JP の漢字が行ボックスの中央より 0.06em 上に寄るためです。書体によるずれは許し、それより大きいずれ（padding や line-height の誤り）を見つけます。

アイコンは文字の字形ではなく**行ボックス**の中心に合わせます。svg は `height: 1lh`、20px の箱は `margin-top: calc((1lh - 20px) / 2)` で置くと、文字の大きさや行の高さが変わっても揃います。

文字の輪郭は、canvas の `measureText` を 100px で測って縮めて求めます。Linux の Chromium は輪郭を整数 px に丸めて返すため、実際の大きさのまま測ると CI だけ 0.3px ほどずれます。

### 部品を組み合わせた画面も測る

部品の Story だけでなく、デモ（`src/App.tsx`、`Patterns/Application`）と画面例（`src/patterns`、`Patterns/Everyday`・`Patterns/Workspace`）も測ります。狭い枠に入れた Meter のはみ出しや、カードいっぱいに伸ばした折れ線など、部品を組み合わせたときにだけ起きるずれがあるためです。測る部品は `src/test/layout/screen-parts.ts` の `SCREEN_PARTS` にまとめ、宣言には `screen: '理由'` を付けます。画面では、操作の要素がすべて宣言に入っているかは見ません（それぞれの部品の Story で見ます）。

### 行の箱を 4px に乗せる

line-height は `--k-line-body` / `--k-line-tight` で 4px の倍数にしていますが、行の箱が 4px の倍数になるとは限りません。外れる原因は、これまでに次の3つがありました。

- **大きさの違う文字を混ぜる**：KEI Mono 36px の値に IBM Plex Sans JP 14px の単位を並べると、単位の文字も親の line-height（44px）を px のまま受け継ぎ、書体ごとのベースラインの位置の違いで行の箱が 51px に広がります。混ぜた側（単位）の `line-height` を `1` にして、行の箱を地の文字だけで決めます（Metric・Meter の単位）。同じ大きさの等幅の数字（表の `<span className="k-mono">` など）は、行の箱を広げません。
- **line-height そのものが 4px に乗っていない**：`1.2` などの倍率は `round(1.2em, 4px)` にします。受け継いだ倍率（本文14px のときの 24 / 14）を 14.4px の等幅の文字に当てると 24.69px になり、ブラウザが半行送りを整数に丸めて中心がずれます。`--k-line-tight` などのトークンを当てます（Pagination のページ番号）。
- **表の罫線を `border-collapse: collapse` で引く**：罫線が隣り合う行に 0.5px ずつ割り振られ、行の高さが 48.5px・49px になります。KEI の表は `border-collapse: separate; border-spacing: 0` で、各セルが自分の罫線をまるごと持ちます。

行高を上書きする点検用の Story（`parameters.layoutStress`）では、この検査は見ません。

要素どうしの重なり（Meter の読み値と目盛りなど）は、まだ測っていません。目盛りは円の帯を mask で描いているため、要素の矩形の交差では判定できず、帯の内側の半径と読み値の矩形を比べる検査が要ります。

### 測る組み合わせ

すべての Story を次の 8 通りで描画して測ります。

- 配色：Paper / Ink
- 密度：comfortable / compact
- 文字：standard（本文16px）/ interface（本文14px）

画面の幅は 1280px、動きを減らす設定（`prefers-reduced-motion: reduce`）で測ります。タッチの画面（`pointer: coarse`）は今は測っていません。

### CSS で静的に検査する

| ルール                 | 基準                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `kei/spacing-grid`     | 余白の px は 4px の倍数（0 と ±1px、`calc()`・`var()` は対象外）。                                              |
| `kei/padding-symmetry` | `kei.components` / `kei.utilities` の部品で、左右の padding が違う値なら理由のコメントを必須にする。            |
| `kei/height-grid`      | `height` / `min-height` / `max-height` の px は 4px の倍数。罫線と目印の 1px・2px、`calc()`・`var()` は対象外。 |
| 説明のない無効化       | `stylelint-disable` には必ず `-- 理由` を書く（`reportDescriptionlessDisables`）。                              |

余白（padding・margin・gap と、名前に padding・gap・space を含むカスタムプロパティ）は `kei/spacing-grid` で 4px の格子に乗せます（0 と ±1px は許可）。

わざと基準を外すときは、その行の直前に理由を書きます。

```css
/* stylelint-disable-next-line kei/padding-symmetry -- 左の検索アイコンの分を空ける */
padding: 0 12px 0 36px;
```

## 宣言のない部品は通さない

`npm run test:layout` は、配置そのものに加えて次のことも検査します。

1. `src/stories` のすべての Story ファイルが、meta の `parameters.layoutGate` に「測る部品」か「測らない理由」を書いている。
2. `src/index.ts` から公開している部品（大文字で始まるもの）ごとに、`meta.component` にその部品を指定し、部品を測る Story がある。入れ物だけのもの（`KeiProvider` など）は `src/test/layout/baseline.ts` の `NOT_A_PART` に理由付きで書く。
3. 描画したボタン・入力・タブなどの操作の要素が、どれかの部品の宣言に入っている。
4. 宣言した部品が、どれかの Story で実際に描画されている（selector の書き間違いを防ぐ）。

## 既知の例外（ベースライン）

検査を入れた時点で基準を満たしていなかった箇所は、理由を付けて一覧にしています。一覧にある間は CI が通り、消すとその箇所に基準が効きます。

- 描画で測るもの：`src/test/layout/baseline.ts` の `BASELINE`
- `kei/height-grid`：`scripts/stylelint-baseline.mjs`

例外は Story の title・部品の名前・検査の名前で照合し、`example`（Story の名前）と `element`（メッセージに出る要素の一部、`「整える」` など）でさらに絞れます。画面の例外は、ずれる要素か Story に絞ってください。部品ごとに外すと、同じ画面で新しく起きたずれも見逃します。

直ったのに一覧に残っている例外は、検査が「もう起きていません」と言って失敗します。一覧は減る方向にしか動きません。新しい部品を例外に足すのは、理由がはっきりしていて、すぐには直せないときだけにしてください。

## 失敗のメッセージ

失敗すると、どの Story・どの組み合わせで、どの部品の、どの部分が、何 px ずれているか、基準は何かを日本語で出します。

```text
[Components/Feedback/Badge › Success｜Paper・標準の密度・本文16px] バッジ（span.k-badge.k-tone-success「稼働中」）の高さの格子：高さが 21.2px です。基準：4px の倍数（近いのは 20px か 24px）。
```

部品の名前は `layoutGate.parts` の `name`、括弧の中は実際の要素とその文字です。
