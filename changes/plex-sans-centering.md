### @lievre/tokens

#### 見た目が変わる

- `--lv-font-sans` の先頭に `'Lievre Sans'` を、`--lv-font-mono` の日本語の前に `'Lievre Sans'` を足した。`@lievre/react/fonts.css` を読み込むと、本文の字が行の中央に来る。（#55）

### @lievre/react

#### 足したもの

- 書体の `@font-face` を配る `@lievre/react/fonts.css`。fontsource の IBM Plex Sans JP を字の位置を補正した `'Lievre Sans'` として、IBM Plex Mono を 1:2 の `'Lievre Mono'` として、400・500・600 で読み込む。`@fontsource/ibm-plex-sans-jp` と `@fontsource/ibm-plex-mono` は任意の peerDependencies。（#55）

#### 直したもの

- IBM Plex Sans JP の漢字とかなが行の中央より 0.07em 上に寄り、Tooltip などの上下の余白が違って見えた。`'Lievre Sans'` は行の高さを変えずに字を 0.07em 下げる。（#55）
- 表のセルの Badge・行の選択のチェックボックス・Skeleton を、行の中央（ベースラインの 0.38em 上）にそろえた。これまでは `vertical-align: middle` で、字の位置を直すと 1.2px 下にずれていた。（#55）
- 見出しを固定した DataTable で、Shift+Tab で戻ったフォーカスが見出しの下に 1px 足らず潜ることがあった。（#55）
