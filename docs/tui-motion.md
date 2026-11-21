# 端末のアスキーアートの動き（構想のメモ）

`@lievre/tui` に、アスキーアートのアニメーションを組み込むための構想です。2026年11月22日に別のセッションで調べてまとめ、同じ日にこのメモをもとに作り始めました。中核は `packages/tui/src/core/motion` にあります。下の「決めたこと」が、作る前に決めた点です。

## 作りたいもの

1. **アニメーションのライブラリ**：`@lievre/tui` の中に置く。起動のバナー、読み込み中の表示、画面の切り替えなどを、lievre の約束（色の役割、幅、スクリーンリーダー、動きの原則）を守ったまま描けるようにする。
2. **skill**：エージェントがこのライブラリを正しく使うための `SKILL.md`。`packages/tui` に同梱する。

## 調べて分かったこと

### すでにある skill

アニメーション向けの skill はいくつかあるが、決定版はない。

| skill                                           | 内容                                                                               | 見立て                                                                                             |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| ascii-banner（npm の `skills-ws`）              | フレームのアニメーション、役割で決める ANSI の色、端末の判定、ちらつき対策、Web 版 | 中身を読んだ。いちばんまとまっている。ただし見本の描画は毎フレーム画面を消していて、ちらつきやすい |
| ascii-animation（iart-ai/web-animation-skills） | 端末の導入画面と読み込み中、画像・動画・3D をアスキーにする                        | Web 寄り                                                                                           |
| ascii-terminal-animation-pack（partme-ai）      | 雨のように文字が降る見本など                                                       | 名前を明示したときだけ動く。GitHub の想定の場所は見つからなかった                                  |
| opentui（msmps/opentui-skill）                  | OpenTUI の TUI 全般。時間軸とループのアニメーション、アスキーの書体のバナー        | アニメーション専用ではない                                                                         |
| create-agent-tui（OpenRouter）                  | グラデーションが流れる読み込み中の表示、点字のスピナー、ブロック文字のバナー       | 読み込み中の表示の参考になる                                                                       |

どれも、下の「ちらつかない描き方」と、文字の選び方（明るさと形）までは押さえていない。lievre の約束も当然入っていない。

### よくできた例から学ぶこと

- **GitHub Copilot CLI の起動のバナー**（GitHub の技術ブログ）
  - フレームの中身と色を分け、色は役割の名前で持つ。利用者がテーマで色を差し替えるため。
  - 白黒の試作はすぐ動いたが、色を付けたとたん、端末ごとの違いとアクセシビリティが一番の難題になった。
  - スクリーンリーダーは、速く書き換わる文字を雑音として読む。動きを止める・遅くする設定を用意した。
  - 約3秒のバナーに、TypeScript で6,000行以上かかった。
- **donut.c**（a1k0n）：面の向きと光の向きの内積で明るさを出し、濃さの順に並べた字（`.,-~:;=!*#$@`）から1字を選ぶ。奥行きの記録（Z バッファ）で手前の面だけを描く。
- **Alex Harri「ASCII characters are not pixels」**：字を明るさでなく形で選ぶ。セルの中の数か所を見た6次元の特徴を、各字の特徴と比べていちばん近い字を当てる。輪郭がはっきりする。Python への移植（`img2contourascii`）もある。
- **ちらつかない描き方**（各ライブラリに共通）
  1. 別の画面（alternate screen）に切り替え、カーソルを隠す。
  2. 見えない場所に次のフレームを描く。
  3. 前のフレームとの差だけを書く。色の指定の重なりも省く。
  4. 1フレームを1回で書き込む。画面を消さず、カーソルを左上（`\x1b[H`）へ戻して上書きする。
  5. 一定の間隔でフレームを進め、終わるとき（Ctrl+C を含む）に端末を元に戻す。
     Ink 8 は変わった行の変わった部分だけを書くので、2〜4 は Ink に任せられる。
- **使える道具**：TerminalTextEffects（Python。効果をフレームの列として返す。見本の一覧が発想の材料になる）、tachyonfx（Rust と Ratatui。描いたあとの面に効果をかけ、重ねる・つなぐ）、dotmax（Rust。点字で細かく描く）。

## lievre の約束との合わせ方

- **中核は Ink に依らない。** 今の `src/core` と `src/ink` の分け方に従う。
- **動きのトークンを使う。** `--lv-motion: 140ms` と `--lv-ease: cubic-bezier(0.2, 0, 0, 1)` を tokens.json から読む。端末のフレームの細かさでは 140ms は4〜5フレームにしかならないので、端末向けの長さを足すかは作るときに決める。
- **進めるのは利用者**（DESIGN.md の原則3）。長さの決まった動きを基本にし、キーで飛ばせるようにする。動き続けるものには止める・再開するキーを付け、動きを減らす設定では止めた状態で始める。
- **スピナーで行を何度も描き直さない**（tui-foundation.md のスクリーンリーダーの節）。終わったら1行で結果を書く。
- **色は役割で持つ。** フレームのセルは字と役割の名前（`accent`・`fg` など）だけを持ち、色の段階（truecolor・256色・16色・なし）ごとの落とし方は `palette.ts` に任せる。16色と色なしでは白黒のフレームにする。薄い文字（`dim`）は使わない。
- **幅が曖昧な字を避ける。** `░▒▓█▌` は East Asian Width が A で、日本語の端末で枠が崩れる。濃淡の段階には N か Na の字だけを使い、それをテストで確かめる。点字（U+2800〜）は N なので、細かく描くときに使える。

## 作りの案

### `src/core/motion`（Ink にも React にも依らない）

| 部分      | 内容                                                                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clock`   | 一定の fps でフレームを数える。テストでは時刻を差し込み、決まったフレームを取り出せる                                                               |
| `ease`    | `cubic-bezier` を読み、長さとカーブをトークンから受け取る                                                                                           |
| `Grid`    | セルごとに字と役割の名前を持つ一画面。色の値（hex）は持たない                                                                                       |
| `effects` | `(grid, t) → grid` の純粋な関数。入り方（reveal・sweep・dissolve）、一字ずつ出す（typewriter）、光が流れる（shimmer）                               |
| `raster`  | 明るさで字を選ぶ（donut.c の方式）、形で字を選ぶ（Harri の方式）、点字で細かく描く                                                                  |
| `ramps`   | 字の組（unicode・ascii）ごとの濃淡の段階。どの字も幅が崩れないことを検査する                                                                        |
| `policy`  | 動かすかを `full`・`reduced`・`off` で返す。スクリーンリーダー（`INK_SCREEN_READER`）、動きを止める環境変数、`TERM=dumb`、端末でない出力、CI を見る |

`off` のときは、最後のフレームか、1行の言葉だけを出す。

### `src/ink/motion.tsx`

`useFrames`、`<Animation>`、`<Banner>`、`<Loading>`。

### テスト

- 決まった時刻のフレームを `renderToString` で書き出し、見本と比べる。
- 字の幅、役割の色の組のコントラスト、`policy` の判定を検査する。

### skill

`packages/tui` に `skills/tui-motion/SKILL.md` として置き、npm の配布物にも入れる。中身は次のとおり。

- 動かしてよいかの判断の順（DESIGN.md の原則への参照を含む）
- API の使い方
- 例：起動のバナー、読み込み中、画面の切り替え
- 確かめること：ちらつき、幅、色の段階、スクリーンリーダー、止める操作

## 決めたこと

- **動きの長さのトークンは足さない。** `--lv-motion` と `--lv-ease` を `tokens.json` から読む。端末の 30fps では 140ms が4〜5フレームにしかならないので、長さの決まった動きは中核の `MIN_FRAMES`（10フレーム、約0.33秒）より短くしない。動き続けるものの1周は `LOOP_FRAMES`（45フレーム、1.5秒）。トークンが要るとわかったら、理由を書いて相談する。
- **置き場所は上の案のまま。** `packages/tui/src/core/motion`（Ink にも React にも依らない）と `packages/tui/src/ink/motion.tsx`。
- **skill は `packages/tui/skills/tui-motion/SKILL.md` に置き、npm の配布物にも入れる。** リポジトリの `.claude/skills` からは読みに行かない。要るようになったら足す。
- **時計は Ink の `useAnimation` に任せる。** 中核は「時計が動き出してから何フレーム目か」から、描くフレーム・キーの意味・終わったかを決める純粋な関数だけを持つ。
- **出典のコードは写していない。** donut.c の「明るさで字を選ぶ」、Harri の「6点の形で字を選ぶ」は考え方だけを借りた。字の形の表は lievre が手で決めた粗い値。

## 出典

- [ascii-banner の SKILL.md（skills-ws）](https://unpkg.com/skills-ws@1.12.0/skills/ascii-banner/SKILL.md)
- [ascii-animation](https://www.ui-skills.com/skills/iart-ai/ascii-animation)
- [ascii-terminal-animation-pack](https://www.skills.sh/full-stack-skills/ascii-skills/ascii-terminal-animation-pack)
- [opentui skill](https://claudemarketplaces.com/skills/msmps/opentui-skill/opentui)
- [OpenRouter create-agent-tui](https://openrouter.ai/docs/guides/coding-agents/create-agent-harness-tui)
- [From pixels to characters（GitHub Blog）](https://github.blog/engineering/from-pixels-to-characters-the-engineering-behind-github-copilot-clis-animated-ascii-banner/)
- [Donut math: how donut.c works](https://www.a1k0n.net/2011/07/20/donut-math.html)
- [ASCII characters are not pixels（Alex Harri）](https://alexharri.com/blog/ascii-rendering)
- [img2contourascii](https://pypi.org/project/img2contourascii/)
- [TerminalTextEffects](https://www.github.com/ChrisBuilds/terminaltexteffects)
- [tachyonfx](https://github.com/junkdog/tachyonfx)
- [dotmax の animation guide](https://docs.rs/crate/dotmax/latest/source/docs/animation_guide.md)
