---
name: tui-motion
description: '@lievre/tui で端末のアスキーアートの動き（起動のバナー、読み込み中の表示、画面の切り替え、点字や濃淡で描く絵）を作るときに使う。動かしてよいかの判断の順、Banner・Loading・Animation・useFrames と core/motion の使い方、色・字の幅・スクリーンリーダー・止める操作の確かめ方。'
---

# 端末の動き（@lievre/tui）

`@lievre/tui` で、Ink 8 の画面にアスキーアートの動きを足すための手引きです。動きの決まりは lievre の `DESIGN.md` に従います。とくに原則3「進めるのは利用者」です。時間で勝手に進めず、動き続けるものには止める操作を付け、動きを減らす設定では止めた状態で始めます。

## 1. 動かしてよいかを、この順で決める

1. **動きがなくても伝わるか。** 伝わらないなら、まず言葉を直す。動きは飾りで、意味を運ばせない。読み上げと端末でない出力では、動きも絵も出ず、`label` の1行だけが残る。その1行で足りるように書く。
2. **長さが決まっているか。** 起動のバナーや画面の入りは、長さの決まった「入り方」（`Banner`・`Animation`）にする。最後のフレームは渡した絵そのままで止まり、Enter・Esc・空白で飛ばせる。
3. **動き続ける必要があるか。** 待つあいだの表示（`Loading`）だけにする。P か空白で止める・再開でき、案内（`[P] 止める`）を同じ行に出す。終わったら `result` の1行に替え、動きを止める。
4. **行を描き直していないか。** 回る印（スピナー）で同じ行を何度も書き換えない。`Loading` は字を変えず、光の帯の色だけを動かす。進み具合は「12 / 40 件」のように言葉で書く。
5. **画面の切り替えに使うか。** 中身の多い画面そのものは動かさない。見出しの下の線や小さな絵を `sweep` で出す程度にとどめる。内容は最初の描画から全部読めるようにする。

動かし方は `motionPolicy` が環境から決めます。利用者に伝える設定は `LIEVRE_MOTION` です。

| 値        | 当たるもの                                                                       | 出るもの                                                                    |
| --------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `full`    | 端末で、下のどれにも当たらないとき                                               | 動く。キーで飛ばす・止める                                                  |
| `reduced` | `LIEVRE_MOTION=reduced`                                                          | 動かない絵。入り方は最後のフレーム、loop は止めた状態から（P で再開できる） |
| `off`     | `INK_SCREEN_READER=true`、端末でない出力、`TERM=dumb`、`CI`、`LIEVRE_MOTION=off` | `label` の1行だけ                                                           |

`LIEVRE_MOTION=full` を指定しても、`off` に当たる環境では動かしません。端末からは OS の「視差効果を減らす」を読めないので、CLI の `--no-motion` のような旗を作るときは `policy="reduced"` を渡します。

## 2. 使い方

部品は `Lievre.Provider`（`palette()` と `glyphs()`）の中で使います。

### 起動のバナー

```tsx
import { Banner } from '@lievre/tui';

const ART = [
  ' _ _',
  '| (_) _____   ___ __ ___',
  '| | |/ _ \\ \\ / / `__/ _ \\',
  '|_|_|\\___|\\_/|_|  \\___/',
];

<Banner art={ART} label="lievre 0.2.0" effect="sweep" onDone={() => setReady(true)} />;
```

- `effect` は `sweep`（左から掃く。先頭の列だけ強調色）・`reveal`（上の行から）・`dissolve`（ばらばらに）・`typewriter`（1字ずつ）か、`(grid, t) => grid` の関数。
- 長さは `--lv-motion` と `--lv-ease` から決まり、`MIN_FRAMES`（10フレーム、約0.33秒）より短くならない。長い絵だけ `frames` で延ばす。数秒に及ぶ入りは作らない。
- `onDone` は最後のフレームまで来たとき（飛ばしたときも）に1回呼ばれる。バナーが終わるまで操作を待たせない。
- `role` で絵の役割（`text`・`accent` など）を選ぶ。色の値は書かない。

### 読み込み中

```tsx
import { Loading } from '@lievre/tui';

<Loading label="請求書を取り込んでいます" result={done ? `${count} 件を取り込みました` : undefined}>
  {`　${current} / ${total} 件`}
</Loading>;
```

- `result` を渡すと、記号（`✓`、ASCII の組では `o`）と言葉の1行になる。失敗は `tone="stop"`、注意は `tone="warn"`。
- `label` は1行に収める。幅が曖昧な字（`…` など）も使えるが、右に揃えるものを置かない。
- 子には言葉（文字列か `<Text>`）だけを渡す。`label` のあとに同じ行で続き、光の帯は掛からない。

### 自分で描く絵

`useFrames` がフレームを、`core/motion` の関数が絵を作ります。絵は `Frame` で描きます。

```tsx
import { Frame, braille, useFrames, useLievre } from '@lievre/tui';

function Orbit() {
  const { g } = useLievre();
  const { phase } = useFrames({ loop: true });
  const a = phase * Math.PI * 2;
  // A cell is about twice as tall as it is wide, so 24 columns × 6 rows is twice as wide as it is
  // tall. Halving the distance along v keeps the dot round.
  const dot = (u: number, v: number) =>
    Math.hypot(u - 0.5 - Math.cos(a) * 0.3, (v - 0.5 - Math.sin(a) * 0.3) / 2) < 0.08 ? 1 : 0;
  return <Frame grid={braille(dot, 24, 6, { set: g.set, role: 'accent' })} label="衛星の軌道" />;
}
```

- 絵の作り方：`makeGrid(lines, role)`（文字から）、`shade`（明るさで字を選ぶ）、`shapes`（6点の形で字を選ぶ。輪郭がはっきりする）、`braille`（2×4 の点。ASCII の組では `shade` に替わる）。
- 効果は `(grid, t) => grid` の純粋な関数。状態を持たないので、どのフレームもあとから描き直せる。
- loop を自分で作ったら、止める・再開するキーの案内（`listening` が true のとき）も自分で出す。

### 中核だけを使う

Ink を使わない描画の層からは、`frameAt`・`togglePlayback`・`skipPlayback`・`progress`・`phase`・`motionAction` でフレームとキーを決め、`toLines`・`runs` で行と色の区間を取り出します。

## 3. 守ること

- **色は役割で持つ。** セルは字と役割の名前だけを持ち、色は `palette()` が端末の段階に合わせて決める。truecolor と 256色では面（`surface`）の上に描き、組は `PAIRS` の基準（文字 4.5:1、`border` 3:1）を満たす。16色と色なしでは色を付けず、強調（`accent`）だけを太字にする。薄い文字（`dim`）は使わない。
- **幅が曖昧な字を使わない。** `░▒▓█▌` `…` `→` などは、日本語の端末で2セルになって格子が崩れる。`makeGrid` は既定でこれらを止める。濃淡は `RAMPS`（unicode は点字、ascii は ` .:-=+*#%@`）から選ぶ。
- **ASCII の組を壊さない。** `LIEVRE_GLYPHS=ascii`・`LIEVRE_AMBIGUOUS=wide`・`TERM=dumb` では `g.set` が `ascii` になる。点字を使う絵には `set: g.set` を渡す。
- **描き直さない。** 時計は Ink の `useAnimation` に任せ、自分で `setInterval` を回さない。止めたとき・終わったときは時計も止まり、何も書かない。画面を消す（`\x1b[2J`）書き方はしない。Ink は既定では毎フレーム出力の全体を書き直すので、動きのある画面は `render(<App />, { incrementalRendering: true })` で描き、変わった行だけを書かせる。
- **キーを取り合わない。** 部品のキーは Ink の `useInput` で読むので、同じときに動いている他の `useInput` にも同じキーが届く。入力欄や選ぶ一覧と同時に出すあいだは `keys={false}` を渡す。そうすると止める操作がなくなるので、動き続ける `Loading` には `policy="reduced"` も渡す。
- **読み上げには言葉を。** `Frame` は絵を読まず `label` を読む。`label` には絵の中身ではなく、伝えたいこと（名前と版、何を待っているか）を書く。

## 4. 確かめること

- `renderToString` で、`policy="reduced"` と `"off"` の出力を見る。`reduced` は絵の全体、`off` は `label` の1行になっているか。
- 入り方の各フレーム（`effect(grid, i / 10)`）で、どの行の幅も `grid.width` のままか。`packages/tui/test/motion.test.tsx` の「keeps the art's width」と同じ形で検査できる。
- `palette()` の4つの段階（truecolor・256・16・none）と、`glyphs({ LIEVRE_GLYPHS: 'ascii' })` で描いてみる。16色で面を塗っていないか、色なしで色が出ていないか。
- 実際の端末で、Enter で飛ばせるか、P で止まって何も書かなくなるか、Ctrl+C で端末が元に戻るか。`INK_SCREEN_READER=true` で、1行だけが出て書き換わらないか。
