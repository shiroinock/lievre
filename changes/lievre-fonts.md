### @lievre/tokens

#### 見た目が変わる

- 等幅の書体を `'Lievre Mono'`（IBM Plex Mono を 5/6 に縮めたもの）から `'Lievre Term JP'` に替えた。英数字は日本語のちょうど半分の幅のまま、英大文字の高さが本文と同じ 0.733em になり、行の中央も本文とそろう。等幅の英数字は前より約 1.26 倍高く見える。（#59）

### @lievre/react

#### 振る舞いが変わる

- `@lievre/react/fonts.css` は、fontsource のファイルを指す `@font-face` の代わりに、lievre の書体 `@lievre/fonts`（https://github.com/shiroinock/lievre-fonts）を読み込む。任意の peerDependencies も `@fontsource/*` から `@lievre/fonts` に替えた。npm にはまだ出していないので、リリースの tgz を入れる（README の「別のプロジェクトで使う」）。`'Lievre Mono'` は定義しなくなった。（#59）
