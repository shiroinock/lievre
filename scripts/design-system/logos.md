# Logos

うさぎと窓の外形は共通で、窓の中身と使う場面で分けています。窓は強調色で塗ります（Paper では `lv-accent` の `#2424d8`）。どの SVG も色を自分の中に持ち、`prefers-color-scheme: dark` では Ink の色（`lv-text` と `lv-accent` の Ink の値）に切り替わります。`<img>` で置いても、色はページから継がれません。

- `lievre-web.svg` — Web 向け。窓の中身は `</>`。
- `lievre-web-small.svg` — 24px 以下とファビコン。線を太くし、窓の中身は `<>`。
- `lievre-web-tile-light.svg` — 明るい版を白い下地に載せたもの。地の色にかかわらず同じに見えます（README の先頭）。
- `lievre-tui.svg` — 端末（`@lievre/tui`）向け。窓の中身は `>_`。
