# @lievre/tokens

lievre のデザイントークンです。設計の考え方は [DESIGN.md](../../DESIGN.md) の「トークン」にあります。

| ファイル      | 内容                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------- |
| `tokens.css`  | トークンの正。`@layer lievre.tokens` の中で `.lievre` とテーマ・密度・文字の組ごとに値を持つ |
| `tokens.json` | `tokens.css` から書き出した交換用のトークン（Design Tokens 形式）。キーに `--lv-` は付かない |

`tokens.css` を変えたら、リポジトリの直下で `pnpm run tokens` を実行して `tokens.json` を書き出します。書き出し忘れは `pnpm test`（`test/tokens.test.mjs`）が止めます。

`@lievre/react` の `styles.css` は `tokens.css` を読み込んで1つにまとめて出すので、Web で使うときにこのパッケージを別に入れる必要はありません。端末の部品（`@lievre/tui`）は `tokens.json` を読みます。
