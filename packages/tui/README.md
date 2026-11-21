# @lievre/tui

lievre のデザイン言語を端末に広げる部品です。描画には Ink 8 を使います。比較と判断は [docs/tui-foundation.md](../../docs/tui-foundation.md) にあります。

| 場所                     | 内容                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `src/core/palette.ts`    | `@lievre/tokens` の `tokens.json` から端末の色を作る。色の段階の判定、256色への落とし方、コントラストの計算         |
| `src/core/glyphs.ts`     | 字の組（標準の文字・Lievre Term・ASCII）                                                                            |
| `src/ink/components.tsx` | Card・Button・Table・Status                                                                                         |
| `src/core/queue.ts`      | 1件ずつ判断する列の状態とキー（`@lievre/react` と同じ決まり。一致はテストで確かめる）                               |
| `src/ink/queue.tsx`      | Queue・QueueProgress・useQueueInput（Y / N / L / Z）                                                                |
| `src/ink/screen.tsx`     | 見本の画面                                                                                                          |
| `src/core/motion`        | 動き：トークンからの長さと曲線、役割の名前で持つ絵（Grid）、入り方と光の帯、濃淡の字、動かすかの判定                |
| `src/ink/motion.tsx`     | Banner・Loading・Animation・Frame・useFrames（入り方は Enter・Esc・空白で飛ばし、動き続けるものは P・空白で止める） |
| `skills/tui-motion`      | エージェント向けの手引き（`SKILL.md`）。動かしてよいかの判断の順、使い方、確かめること。npm の配布物にも入る        |

`src/core` は Ink に依りません。描画の道具を替えるときは `src/ink` だけを書き直します。

```sh
npm test -w packages/tui       # 描画（renderToString）とコントラスト
npm run build -w packages/tui  # lib/ に書き出す
```

`test/tui.test.tsx` は、truecolor と 256色の色の組がそれぞれの基準（文字 4.5:1、部品と輪郭 3:1）に届くか、日本語を2セルに数えてカードの右端が揃うか、16色で面を塗らないか、色なしで色を出さないかを検査します。

操作できる見本、画面の書き出し（`out/*.ans`・`*.png`）、試しの書体は、試作の [spikes/tui](../../spikes/tui/README.md) に残しています。

`test/motion-core.test.tsx` と `test/motion.test.tsx` は、動きの絵がどのフレームでも幅を保つか、字の組に幅が曖昧な字がないか、役割の色の組が同じ基準に届くか、動かし方の判定、キーで飛ばす・止める操作、読み上げで1行だけを出して書き換えないかを検査します。
