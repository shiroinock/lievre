# Combobox の土台の試作

部品の第2段階（Combobox・DatePicker）の土台を選ぶための試作です。結論と理由は [docs/combobox-foundation.md](../../docs/combobox-foundation.md) にあります。**本体（`packages/`）には入れません。** 依存はこのフォルダの `package.json` だけに入れています。

## 中身

| ファイル                    | 内容                                                                                                                                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/shared.tsx`            | 3つの土台で共通にする層。lievre に入れるときは、ここが lievre の側で持つ部分になる。正規化（`normalize`）、IME の守り（`useImeGuard`）、PortalSurface の入れ物、Radix の Popover を枠にする `RadixShell` |
| `src/AriaCombobox.tsx`      | React Aria（react-aria-components）。`shell='radix'` は枠を Radix にする試み（うまく動かない。理由はファイルの注記）                                                                                     |
| `src/AriakitCombobox.tsx`   | Ariakit。`shell='radix'` で枠を Radix の Popover にする                                                                                                                                                  |
| `src/DownshiftCombobox.tsx` | Downshift（`useCombobox`）。`shell='own'` は floating-ui と PortalSurface を自分で組み、`shell='radix'` は Radix の Popover にする                                                                       |
| `src/AriaDatePicker.tsx`    | DatePicker に広げられるかを見る最小の試作（React Aria・和暦）                                                                                                                                            |
| `src/spike.css`             | Combobox の見た目。lievre.css の Select と同じ値                                                                                                                                                         |
| `test/behavior.mjs`         | 同じ操作を全部の組み合わせと lievre の Select に流す（Chromium・WebKit）                                                                                                                                 |
| `test/summary.mjs`          | 結果を ○／× の表（`test/summary.md`）にする                                                                                                                                                              |
| `test/ime-cdp.mjs`          | Chromium の IME の経路（CDP）で変換中の文字を入れて確かめる                                                                                                                                              |
| `scripts/size.mjs`          | lievre のライブラリに足したときの gzip の増分を測る                                                                                                                                                      |

## 動かし方

リポジトリの直下で `npm install` してあることが前提です（react・radix-ui・vite はそちらを使います）。

```sh
cd spikes/combobox
npm install          # 試作だけの依存（.npmrc で peer の react は入れない）
npx playwright install chromium webkit
npm run dev          # http://127.0.0.1:5180/?impl=downshift&shell=radix&ctx=dialog
npm run check        # 別の端末で。test/results.json を書く
node test/summary.mjs
node test/ime-cdp.mjs
npm run size
```

ページの切り替え：`impl=aria|ariakit|downshift|select|datepicker`、`shell=own|radix`、`ctx=plain|dialog`、`guard=0`（IME の守りを外す）、`theme=ink`、`error=1`、`wareki=1`（datepicker）。

## IME の確かめ方と限り

- `test/behavior.mjs` は合成のイベントで、Chrome の順（確定の Enter が `isComposing=true` で `compositionend` の前）と Safari の順（`compositionend` のあとに `keyCode=229`・`isComposing=false` の Enter）を、どちらのエンジンでも再現します。土台の判定の分岐を確かめるためのもので、OS の IME そのものではありません。
- `test/ime-cdp.mjs` は Chromium の IME の経路を使います。イベントはブラウザ自身が出します。
- macOS の日本語入力（ことえり／Google 日本語入力）を使った手での確認と、VoiceOver での確認は、この試作ではしていません。手順は docs/combobox-foundation.md の「残っている確認」にあります。
