# KEI から lievre へ移る

KEI（`@kei-design/react`）は lievre に名前を改めました。部品・トークン・格子の決まり（4px の格子、等幅の英数字と日本語の幅を 1:2 にすること）・見た目は変わらず、名前だけが変わります。

npm にはまだどちらの名前も公開していないので、移る必要があるのは、`npm pack` したパッケージを入れているアプリだけです。

## 変わる名前

| 対象                 | 改名の前                                                       | 改名のあと                                                              |
| -------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| パッケージ           | `@kei-design/react`（`@kei-design/tokens`・`@kei-design/tui`） | `@lievre/react`（`@lievre/tokens`・`@lievre/tui`）                      |
| 読み込み             | `@kei-design/react/styles.css`・`/tokens.json`・`/lint`        | `@lievre/react/styles.css`・`/tokens.json`・`/lint`（副パスは同じ）     |
| 部品と hook          | `KeiProvider`・`useKeiTheme`                                   | `LievreProvider`・`useLievreTheme`                                      |
| 根のクラス           | `.kei`・`.kei-portal`                                          | `.lievre`・`.lievre-portal`                                             |
| 部品のクラス         | `.k-mono`・`.k-tabular` など                                   | `.lv-mono`・`.lv-tabular` など                                          |
| CSS 変数             | `--k-accent` など                                              | `--lv-accent` など                                                      |
| カスケードの層       | `kei.tokens`・`kei.base`・`kei.components`・`kei.utilities`    | `lievre.tokens`・`lievre.base`・`lievre.components`・`lievre.utilities` |
| lint のルールと設定  | `kei/metric-unit`、`settings.kei`                              | `lievre/metric-unit`、`settings.lievre`                                 |
| 等幅の書体の名前     | `'KEI Mono'`                                                   | `'Lievre Mono'`                                                         |
| 質感の焼き込みの書体 | `'KEI Worn Sans'`・`'KEI Worn Mono'`                           | `'Lievre Worn Sans'`・`'Lievre Worn Mono'`                              |
| 質感のソルトの既定値 | `kei`                                                          | `lievre`                                                                |

`data-theme`・`data-density`・`data-typography`・`data-wear` などの属性、props、トークンの JSON のキー（`paper.accent` など。頭が付いていない）は変わりません。

## 手順

1. **パッケージを入れ替える。** `npm uninstall @kei-design/react` のあと、`@lievre/react` を入れます。
2. **書き換える。** まず何が変わるかを見てから、書き換えます。

   ```sh
   npx lievre-migrate --dry-run src
   npx lievre-migrate src
   ```

   `lievre-migrate` は `@lievre/react` に入っています。読み込み、`KeiProvider`、文字列の中のクラスと CSS 変数、層の名前、書体の名前、ESLint・Oxlint・Biome の設定を書き換えます。クラスと CSS 変数は、lievre に同じ名前（頭だけ違うもの）があるときだけ書き換えるので、アプリが自分で付けた `k-` で始まるクラスは残ります。

3. **残りを lint で探す。** lint の設定に `lievre/no-legacy-prefix` を足します（`configs.recommended` には入っています）。文字列を組み立てて作ったクラス（`` `k-${name}` ``）のように、書き換えで拾えなかったものを知らせます。メッセージに直し方が書いてあります。アプリに `k-` で始まる自分のクラスがあるときは、移り終えたらこのルールを外してください。
4. **CSS のリセットの層を直す。** アプリの CSS で層の順を宣言しているときは、`@layer reset, lievre.tokens, lievre.base, lievre.components, lievre.utilities;` にします（`lievre-migrate` が書き換えます）。
5. **書体を自分で定義しているとき。** README の「別のプロジェクトで使う」のとおり、`@font-face` の `font-family` を `'Lievre Mono'` にします。
6. **質感（試作）の擦れの位置が変わります。** ソルトの既定値が変わったので、同梱の焼き込み（`wear="baked"`）の画像を作り直しました。強さなどの値は同じで、擦れの位置だけが違います。`wear="live"` で前と同じ位置にしたいときは `wearSeed="kei"` を渡します。

## このリポジトリで開発する人へ

- 質感の焼き込みで使う Python を指定する変数は `KEI_WEAR_PYTHON` から `LIEVRE_WEAR_PYTHON` に、`KEI_WEAR_ROUGH` などは `LIEVRE_WEAR_ROUGH` などになりました。
- 焼き込んだ書体（`packages/react/wear-fonts/`、git に入れていない）は、書体の名前が変わったので `npm run wear:font` で作り直してください。作り直すまで `npm test` の書体の検査が失敗します。
- stylelint の独自のルールは `lievre/spacing-grid` などになりました。行ごとに外すときは `/* stylelint-disable-next-line lievre/spacing-grid -- 理由 */` と書きます。
- 改名し損ねは `npm test`（`packages/react/src/test/naming.test.tsx`）が止めます。古い名前を書いてよいのは、この文書、`lievre-migrate` とそのテスト、`no-legacy-prefix` のテスト、`docs/tui-foundation.md` の改名の計画、ベンチマークの過去の結果だけです。

## 古い名前を残す移行の期間（案）

| 案                                                                                                                                                   | 良い点                                                       | 困る点                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. 期間を設けない**（推奨）                                                                                                                        | 互換の層の保守が要らない。`--k-*` と `--lv-*` が混ざらない   | 入れ替えた日にアプリを直す必要がある。ただし、いま使っているのはこのリポジトリのデモと作者のアプリだけで、`lievre-migrate` で数分で終わる            |
| B. 1つ前の版のあいだ、CSS の互換の層を出す（`styles.css` に `--k-*: var(--lv-*)` を足し、`@kei-design/react` を `@lievre/react` の再 export にする） | 入れ替えてすぐに壊れない                                     | クラス（`.k-*`）は別名を作ると CSS が倍になるので、変数しか守れない。`@kei-design` のスコープで公開し続ける必要がある。互換の層を外す版がもう1回要る |
| C. lint の警告だけを残す（`no-legacy-prefix` を `warn` にして、次の版で `error`）                                                                    | アプリは動かないが、どこを直すかは分かる。互換の層は要らない | 動かない状態で警告するだけなので、期間を設ける意味は薄い                                                                                             |

**A を推します。** npm にまだ公開していないので、古い名前に頼っている人はいません。公開したあとに名前を変えることになったら、そのときは B で1つ前の版のあいだ互換の層を残します。
