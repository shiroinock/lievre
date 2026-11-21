### @lievre/tui

#### 足したもの

- 端末の `CommandPalette` と、キーを受ける `useCommandPaletteInput`。Web と同じ「mod + K」で開き、端末ではどの OS でも Ctrl+K（⌘K は ⌘ を渡す端末でだけ）。打つと名前・読み・探し言葉・補足で絞り込み（Web と同じ答え）、上下で移り、Enter で選び、Esc で閉じる。項目は `group` ごとに見出しの下へまとめ、多いときは選びかけの周りだけを描いて前後の件数を言葉で出す。読み上げの設定では、枠と線を読ませず、入力欄・件数・項目を役割と状態つきで出す。状態と絞り込みの `paletteKey`・`filterCommands` は Ink に依らない。（#29）
