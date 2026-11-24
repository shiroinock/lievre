# 変更履歴の断片

利用する側に見える変更をする PR は、ここに断片を1つ足します。公開するときに `pnpm run changelog:release <版>` が、断片を [CHANGELOG.md](../CHANGELOG.md) の版の見出しの下にまとめ、断片を消します。

## 名前

PR の枝の名前から `claude/` などを除き、`.md` を付けます（例：枝 `claude/component-chip` なら `changes/component-chip.md`）。ほかの PR と重ならない名前なら、内容を表す名前でもかまいません。`claude/` と `codex/` は同じように除くので、`claude/foo` と `codex/foo` のように残りが同じ枝が並ぶときは、片方の名前を変えます。1つの PR で1ファイルです。

## 中身

CHANGELOG.md と同じ見出しで書きます。

```md
### @lievre/react

#### 足したもの

- 分類や選んだ値を示す `Chip` と `ChipGroup`。（#6）

#### 直したもの

- Tooltip が画面の端で切れていた。反対側に回るようにした。（#6）

### @lievre/tui

#### 足したもの

- 端末の `Chip`。（#6）
```

- パッケージ（`###`）：`@lievre/tokens`・`@lievre/react`・`@lievre/tui`。
- 区分（`####`）：見た目が変わる・振る舞いが変わる・足したもの・直したもの。決め方は CHANGELOG.md の冒頭にあります。断片の中の順は問いません（まとめるときに並べ直します）。
- 項目：`- ` で始めて1つに1つ、利用する側の言葉で書き、末尾に PR の番号を付けます（例：`（#6）`）。長いときは、続きの行を2文字下げます。
- `<!-- -->` のコメントは読みません。

`pnpm run check:changelog` が、書き忘れと書き方を確かめます。まとめたときの並びは、`pnpm run changelog:release 0.3.0 --dry-run` で書き込まずに見られます。
