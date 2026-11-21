### @lievre/react

#### 足したもの

- 全角・半角を直す関数 `toHalfWidth`（数字・英字・記号・空白を半角に。半角のカタカナや①・㈱は変えない。`dashes` で横棒の仲間をハイフンに）、`toFullWidthKana`（半角のカタカナを全角に）、`toSearchKey`（全角と半角・カタカナとひらがな・大文字と小文字・空白の違いを無視して比べる形）。（#PR）
- TextField に `halfWidth`（入力欄を離れたときに `toHalfWidth` で直す。変換中の文字は直さない）。（#PR）
- 数と日付の書式の `FormatNumber`（桁区切り・小数の桁・割合・符号。数字は等幅、単位は本文の書体）と `FormatDate`（`<time datetime>` に出す。和暦の `calendar="japanese"`、今との差の `relative`）。同じ書式の関数 `formatNumber`・`formatDate`・`formatRelativeTime`。（#PR）
