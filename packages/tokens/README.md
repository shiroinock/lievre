# @kei-design/tokens

KEI のデザイントークンです。設計の考え方は [DESIGN.md](../../DESIGN.md) の「トークン」にあります。

| ファイル      | 内容                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------- |
| `tokens.css`  | トークンの正。`@layer kei.tokens` の中で `.kei` とテーマ・密度・文字の組ごとに値を持つ      |
| `tokens.json` | `tokens.css` から書き出した交換用のトークン（Design Tokens 形式）。キーに `--k-` は付かない |

`tokens.css` を変えたら、リポジトリの直下で `npm run tokens` を実行して `tokens.json` を書き出します。書き出し忘れは `npm test`（`test/tokens.test.mjs`）が止めます。

`@kei-design/react` の `styles.css` は `tokens.css` を読み込んで1つにまとめて出すので、Web で使うときにこのパッケージを別に入れる必要はありません。端末の部品（`@kei-design/tui`）は `tokens.json` を読みます。
