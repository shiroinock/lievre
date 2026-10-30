# 端末（TUI）の試作

KEI のデザイン言語を端末に広げるための試作です。改名の予定に合わせて、仮に `@lievre/tui` という名前にしています（`private` で、公開しません）。比較と推奨は [docs/tui-foundation.md](../../docs/tui-foundation.md) にあります。

**部品（`src/core` と `src/ink`）は [packages/tui](../../packages/tui/README.md) に移しました。** ここに残したのは、操作できる見本、画面の書き出し、試しの書体です。どれも `packages/tui/src` をパスで読みます。

カード・ボタン（フォーカスの状態を含む）・表（数値の桁揃えと状態の表示）を、Ink 8 で描きます。

## 中身

色と字の組を決める中核（`packages/tui/src/core`）は Ink に依りません。描画の道具を OpenTUI などに替えるときは、`packages/tui/src/ink` だけを書き直します。

| ファイル                      | 内容                                                                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/main.tsx`            | 操作できる見本。Tab と Shift+Tab でフォーカスを動かし、表では ↑↓ で行を選び、q で終わる。OSC 11 で背景の明るさを問い合わせる           |
| `scripts/capture.tsx`         | 色の段階・テーマ・字の組ごとに `out/*.ans`（ANSI の色付きのテキスト）と `out/contrast.md` を書く                                       |
| `scripts/shot.mjs`            | `out/*.ans` を xterm.js（WebGL の描画）で描き、`out/*.png` を撮る。Lievre Term の画面は、書体を入れた場合と入れていない場合の2枚を撮る |
| `font/build.py`               | 試しの書体「Lievre Term」を作り、検査する（送り幅が1セルか、名前に「Plex」が入っていないか）                                           |
| `font/LievreTerm-Regular.ttf` | 試しの書体。IBM Plex Mono（Latin）に10字を足したもの。OFL 1.1（`font/OFL.txt`）                                                        |

## 動かし方

リポジトリの直下で `npm install` してあることが前提です（react・ink・playwright はそちらを使います）。

```sh
cd spikes/tui
npm install
npm start                                           # 操作できる見本
LIEVRE_THEME=ink LIEVRE_GLYPHS=lievre-term npm start # Lievre Term を入れた端末で
NO_COLOR=1 INK_SCREEN_READER=true npm start         # スクリーンリーダー向けの出力
npm run capture                                     # out/*.ans と out/contrast.md
npm run shot                                        # out/*.png
npm run typecheck
```

`out/*.ans` は、端末で `cat out/truecolor-paper-unicode.ans` とすれば、そのまま色付きで見られます。

書体を作り直すときは、fontTools と brotli の入った Python で実行します（`pip install fonttools brotli`）。

```sh
python3 -I font/build.py
```

## 残した結果

| ファイル                                            | 内容                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| `out/truecolor-{paper,ink}-unicode.png`             | truecolor、標準の文字                                                   |
| `out/256-{paper,ink}-unicode.png`                   | 256色                                                                   |
| `out/16-{paper,ink}-unicode.png`                    | 16色。色は撮影に使った端末のテーマ（macOS の Terminal の「Basic」）の値 |
| `out/none-paper-unicode.png`                        | 色なし（`NO_COLOR`）                                                    |
| `out/16-paper-ascii.png`                            | 曖昧な文字を全角にする端末向けの ASCII の組                             |
| `out/truecolor-{paper,ink}-lievre-term.png`         | Lievre Term を入れた端末                                                |
| `out/truecolor-{paper,ink}-lievre-term-no-font.png` | Lievre Term の字を選んだのに、書体が入っていない端末（豆腐になる）      |
| `out/contrast.md`                                   | truecolor と 256色のコントラスト                                        |
| `out/screen-reader.txt`                             | `INK_SCREEN_READER=true` の出力                                         |

各画像は、上の2枚が「保存する」にフォーカスがある状態、下の2枚が表の3行目を選んだ状態です。スクリーンショットは xterm.js で撮ったもので、実機の端末では確かめていません。
