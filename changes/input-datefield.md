### @lievre/react

#### 振る舞いが変わる

- TextField に渡した `aria-invalid` が、`error` を渡していないときにも入力欄に付く。これまでは Field の値で消えていた。（#PR）

#### 足したもの

- 年・月・日を3つの欄に直接入れる `DateField`。全角の数字も受け、欄を離れると半角に直す。まとまりを離れたときに、足りない欄・存在しない日（2月30日）・`min` と `max` の外を確かめ、直し方のわかる文を出す。値は ISO 8601 の日付で、確かめて通るまでは null。`autoComplete="bday"` で生年月日の自動入力を伝える。確かめる関数 `checkDate` と、その文を作る `dateCheckMessage`。依存に `@internationalized/date` を足した。（#PR）
