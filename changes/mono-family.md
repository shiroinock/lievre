### @lievre/react

#### 足したもの

- 画面全体を日本語ごと等幅にする `LievreProvider` の `family`（`'sans'` | `'mono'`）。入れ子では指定しない値を外側から引き継ぎ、`family="sans"` で本文の書体に戻せる。等幅の中では小さい文字も 14.4px（`--lv-text-mono-min`）より小さくしない。（#57）
- 範囲を等幅にする `Text` と `Card` の `mono`、クラス `lv-family-mono`。中に置いた部品も等幅になり、英数字 1 対日本語 2 の幅で桁がそろう。（#57）

#### 見た目が変わる

- Breadcrumb の行の高さを `--lv-line-body`（13px で 24px）にした。これまでは本文の倍率を受け継ぎ、22.75px だった。（#57）
