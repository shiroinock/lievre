### @lievre/react

#### 足したもの

- キーの近道（既定は ⌘K / Ctrl+K、`hotkey` で変えられる）で開く `CommandPalette`。打つと名前・読み・探し言葉・補足で絞り込み、↑↓ で移り、Enter で実行し、Esc で閉じる。項目は `group` ごとに見出しの下へまとめる。入力欄は combobox、一覧は listbox と group で、項目の数を読み上げる。日本語の変換中は、絞り込みも実行も閉じもしない。閉じるとフォーカスは開く前の場所へ戻り、そのあとで項目の `onSelect` を呼ぶ。枠は Dialog と同じ。キーの見た目と `aria-keyshortcuts` の値を作る `describeHotkey`、絞り込みの `filterCommands` も足した。（#28）
