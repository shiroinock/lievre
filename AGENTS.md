# エージェント向けの作業メモ

lievre のリポジトリで作業する AI エージェント向けです。利用する側の使い方は [llms.txt](packages/react/llms.txt) にあります。

## 場所

npm のワークスペースです。パッケージは `packages/` に3つあります。

- `packages/tokens`（`@lievre/tokens`）：トークンの正 `tokens.css` と、そこから書き出す `tokens.json`。
- `packages/react`（`@lievre/react`）：部品は `src/components`（`src/index.ts` から export）、スタイルは `src/styles/lievre.css`。Story は `src/stories`、テストは `src/test`。
- `packages/tui`（`@lievre/tui`）：端末の部品。色と字の組を決める `src/core` と、Ink で描く `src/ink`。
- 独自の lint：`packages/react/scripts/stylelint-lievre.mjs`（CSS）、`packages/react/eslint.config.mjs`（TSX）。ルールごとのテストは `packages/react/src/test/lint.test.tsx`。
- 設計：`DESIGN.md`（リポジトリの直下。`npm pack` のときに `packages/react` へ写します）。
- 見本集：`scripts/design-system/`（Claude の Design System の Artifact に載せるファイルを書き出す。下の「見本集を更新する」）。

## 確かめる

```sh
npm run typecheck && npm run lint && npm test
```

- コマンドはリポジトリの直下で実行します。各パッケージに流れます（1つだけなら `-w packages/react` のように付けます）。
- `tokens.css` を変えたら `npm run tokens`、部品の props や説明（`/** */`）を変えたら `npm run llms`。どちらも書き出し忘れは `npm test` が止めます。
- `package-lock.json` を変えても `flake.nix` は直さなくてよい（Nix は `importNpmLock` で lock の `integrity` から取る）。URL で入れる依存を足したら `nix build` で確かめる。取ってこられないものは CI の「Nix のハッシュ」が止めます。
- 作業の前に下書きの PR を開き、本文の「触るファイル」を書いてから `npm run check:overlap` を流す。ほかの開いた PR と重なるファイルが出たら、手を付ける前に分け方を決めるか、相手の枝に積む。
- `npm run build` は react の lib・デモ・Storybook と、tui の lib まで作ります。`npm run check:pack -w packages/react` で `npm pack` の中身を確かめます。

## 見本集を更新する

部品・トークン・ロゴを一目で見られる見本集を、Claude の Design System の Artifact（<https://claude.ai/artifact/MKuBVqdjz5m4XGVhygsaqQ>、非公開）に置いています。中身はすべてコードから `npm run design-system` で書き出します。CI からは Artifact に載せられないので、エージェントが載せます。

- **いつ**：`packages/react/src`（部品・スタイル・Story）、`packages/tokens/tokens.css`、`logo/`、`scripts/design-system/` のどれかを変えた PR が `main` にマージされたあと。`DESIGN.md` の約束を変えたときは、先に `scripts/design-system/README.md`（見本集の README の元）を合わせる PR を出す。
- **目録**：カードになるのは `src/index.ts` が export する部品で、見本は `src/stories/<部品>.stories.tsx` の Story から作る。部品を足して Story がないと `npm test` が止まる。部品でない export（Provider など）は `scripts/design-system/inventory.mjs` の `NO_CARD` に理由と一緒に書く。トークンを足したら `scripts/design-system/token-usage.mjs` に使いどころを1行書く（これも `npm test` が止める）。

手順（作業用のフォルダ `<dir>` は Claude の scratchpad の中に置く。Artifact へは作業ディレクトリか scratchpad の中のファイルしか送れない）：

1. 最新の `main` で `npm ci`。
2. Artifact を `read` し直す：まず `path` を付けずに読み（`path` 付きで読むだけでは「最新版を見ていない」と publish を断られる）、続けて `path: "project/sync/files.json"`（前に載せたファイルの sha256）と `path: "project/design-system.json"`（索引）を読む。保存先を控える。
3. `npm run design-system -- --out <dir> --against <控えた files.json>` を流す。`<dir>/changed.json` に、載せ直すファイル（`changed`。`project/sync/files.json` も含む）、消すファイル（`removed`）、上げ直すロゴ（`logos`）が出る。同じコミットからは同じバイトが出るので、ここに出ないファイルは送らない。
4. `logos` が空でなければ、`<dir>/project/assets/Logos/` のそのファイルを `asset: true` で Artifact に上げ、返ってきた id・大きさと `logo/` のファイルの sha256 を `scripts/design-system/assets.json` に書いて、手順 3 を流し直す。`assets.json` の変更は PR にする。
5. 索引をまとめる：手順 2 で読んだ索引をもとに、`title`・`namespace`・`libraries`・`editing`・`groups`・`assetGroups`・`lastChange` だけを `<dir>/project/design-system.json` の値に置き換え、ほかのキー（`createdOnFiles`・`sections`・`blobs`・`docs` など）は読んだままにして、`<dir>/project/design-system.json` に書き戻す。
6. 1回の `publish` で送る：`url` は上の Artifact、`root` は `<dir>`、`file_path` は `<dir>/project/design-system.json`、`files` は `changed` の各パス（`"project/…": "project/…"`。`project/components/index.d.ts` は `{"from": "project/components/index.d.ts", "contentType": "text/plain"}`）と、`removed` の各パスを `null`。255 個を超えるときは分けて送り、索引は最後の回にだけ入れる。
7. 誰かが間に保存して断られたら、手順 2 から1度だけやり直す。また断られたら止めて、ユーザーに伝える。

- 索引の `editing: "code"` で、ページ側では編集できない。変えたいときはコードを直して載せ直す。
- 見本は React 18.3.1（jsDelivr）で動かしている。`@lievre/tui` は入れていない。

## 約束

- 文書・コミット・PR・ラベルは日本語。英大文字の飾りラベルは使わない。
- レビューで見つかった誤りは、できるだけ lint やテストで次から止める。ルールのメッセージには直し方を書く。
- 改名の前の名前は書かない（[MIGRATION.md](MIGRATION.md)）。残っていると `npm test` が止める。
- 部品の props には `/** */` で説明を付ける。説明はそのまま `llms.txt` とエディタの補完に出る。
- 利用する側に見える変更（`packages/*/src` の部品・スタイル、`packages/react` の `bin`・`lint`、`tokens.css`）は、`changes/` に PR ごとの断片を1つ足す（`changes/<枝の名前>.md`、書き方は [changes/README.md](changes/README.md)）。[CHANGELOG.md](CHANGELOG.md) の「未公開」には書かない。見えない変更なら PR の説明に「変更履歴：なし（理由）」と書く。書き忘れは CI の「変更履歴」が止める（`npm run check:changelog` で手元でも見られる）。公開のときは `npm run changelog:release -- <版>` で断片を CHANGELOG.md にまとめる。
- PR のレビューは CI（`.github/workflows/claude-code-review.yml`）で Claude Code が行い、直す必要のある指摘がなければラベル「マージ予約」を付ける。指摘はコメントで残るので、直して push する（レビューが走り直す）。手でレビューしたときは、終えたら手で付ける（`gh pr edit <番号> --add-label マージ予約`）。向き先が `main` になると自動マージが入る。積んだ PR に `gh pr merge --auto` を手で入れない（前の枝へその場でマージされる）。詳しくは [CONTRIBUTING.md](CONTRIBUTING.md) の「マージの予約」。
