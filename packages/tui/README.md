# @lievre/tui

lievre のデザイン言語を端末に広げる部品です。描画には Ink 8 を使います。比較と判断は [docs/tui-foundation.md](../../docs/tui-foundation.md) にあります。

| 場所                     | 内容                                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `src/core/palette.ts`    | `@lievre/tokens` の `tokens.json` から端末の色を作る。色の段階の判定、256色への落とし方、コントラストの計算 |
| `src/core/glyphs.ts`     | 字の組（標準の文字・Lievre Term・ASCII）                                                                    |
| `src/ink/components.tsx` | Card・Button・Table・Status                                                                                 |
| `src/ink/screen.tsx`     | 見本の画面                                                                                                  |

`src/core` は Ink に依りません。描画の道具を替えるときは `src/ink` だけを書き直します。

```sh
npm test -w packages/tui       # 描画（renderToString）とコントラスト
npm run build -w packages/tui  # lib/ に書き出す
```

`test/tui.test.tsx` は、truecolor と 256色の色の組がそれぞれの基準（文字 4.5:1、部品と輪郭 3:1）に届くか、日本語を2セルに数えてカードの右端が揃うか、16色で面を塗らないか、色なしで色を出さないかを検査します。

操作できる見本、画面の書き出し（`out/*.ans`・`*.png`）、試しの書体は、試作の [spikes/tui](../../spikes/tui/README.md) に残しています。
