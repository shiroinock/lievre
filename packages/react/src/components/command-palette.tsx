// Command palette: a dialog with one search field and the list of commands under it, opened by a
// shortcut. Downshift holds the highlighted command, the keys and the combobox ARIA, as in
// Combobox; the list stays open for as long as the dialog is. The layer is Radix's Dialog, the
// same one Dialog and ConfirmDialog use, so Esc, outside clicks, the focus trap and stacking
// behave the same.
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CompositionEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useCombobox } from 'downshift';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { Search } from 'lucide-react';
import { cx, PortalSurface } from './system';
import { Button, Kbd, VisuallyHidden } from './primitives';
import { toSearchKey } from './normalize';
import { fromIme } from './ime';

export type CommandItem = {
  /** 項目を見分ける値。重ならないようにします。パレットの onSelect に渡します。 */
  value: string;
  /** 一覧に出す名前。「新しい作業を作る」のように、何が起きるかを動詞で書きます。 */
  label: string;
  /** 読み（ひらがな）。漢字の名前を、読みでも探せるようにします（「せってい」で「設定を開く」）。 */
  kana?: string;
  /** 名前に出ない探し言葉。英語の名前や略称（「settings」「新規」）を入れます。 */
  keywords?: string[];
  /** まとまりの名前（「移動」「操作」）。同じ group の項目は、最初に出てきた順に見出しの下へまとめます。 */
  group?: string;
  /** 名前の下に出す補足（行き先・対象など）。読み上げでは名前に続けて読みます。 */
  description?: string;
  /** 項目の右に出すキーの近道（「⌘S」）。見せるだけで、パレットはこのキーを受け付けません。 */
  shortcut?: string;
  /** 選べないようにします。一覧には残し、矢印キーでは飛ばします。 */
  disabled?: boolean;
  /** 選んだときに呼びます。パレットを閉じ、フォーカスを開く前の場所に戻してから呼ぶので、中でフォーカスを動かしたり画面を移ったりできます。 */
  onSelect?: () => void;
};

export type CommandHotkey = {
  /** 文字のキー（e.key の値。大文字と小文字は区別しません）。既定のパレットは 'k'。 */
  key: string;
  /** Mac では ⌘、ほかでは Ctrl を押しながら。1文字のキーを document 全体で受けないように、mod か alt のどちらかは付けます。 */
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
};

export type CommandPaletteProps = {
  /** 並べる項目。group ごとにまとめ、絞り込んだ結果も同じ順で出します。 */
  items: CommandItem[];
  /** パレットの名前。ダイアログと入力欄の名前として読み上げます。 */
  label?: string;
  /** 何も入れていないときの文字。 */
  placeholder?: string;
  /** 開くキー。既定は ⌘K（Mac）/ Ctrl+K（ほか）。document 全体で受け、もう一度押すと閉じます。false で付けません（trigger か open で開きます）。 */
  hotkey?: CommandHotkey | false;
  /** 開くボタン。省くと「コマンドを探す」とキーを見せるボタンを出し、aria-keyshortcuts を付けます。null で出しません。 */
  trigger?: ReactNode | null;
  /** 開いているか。渡すと外で持ちます。 */
  open?: boolean;
  /** 外で持たないときの、はじめの開き方。 */
  defaultOpen?: boolean;
  /** 開いた・閉じたときに呼びます。 */
  onOpenChange?: (open: boolean) => void;
  /** 項目を選んだときに、項目の onSelect のあとで呼びます。 */
  onSelect?: (value: string) => void;
  /** 一致する項目がないときの文。 */
  emptyText?: string;
};

export const DEFAULT_COMMAND_HOTKEY: CommandHotkey = { key: 'k', mod: true };

const isMac = () =>
  typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.platform ?? '');

/**
 * キーの近道を、見せる文字（「⌘K」「Ctrl+K」）と aria-keyshortcuts の値（「Meta+K」「Control+K」）にします。
 * 自前の開くボタンにキーを添えるときに使います。mac を省くと、いまの環境で決めます。
 */
export function describeHotkey(hotkey: CommandHotkey, mac = isMac()) {
  const key = hotkey.key.length === 1 ? hotkey.key.toUpperCase() : hotkey.key;
  const label = mac
    ? `${hotkey.alt ? '⌥' : ''}${hotkey.shift ? '⇧' : ''}${hotkey.mod ? '⌘' : ''}${key}`
    : [hotkey.mod && 'Ctrl', hotkey.alt && 'Alt', hotkey.shift && 'Shift', key]
        .filter(Boolean)
        .join('+');
  const aria = [
    hotkey.mod && (mac ? 'Meta' : 'Control'),
    hotkey.alt && 'Alt',
    hotkey.shift && 'Shift',
    key,
  ]
    .filter(Boolean)
    .join('+');
  return { label, aria };
}

/** Whether a keydown is the hotkey. ⌘ on a Mac and Ctrl elsewhere, never both; the other
 * modifiers must match exactly so ⌘⇧K doesn't open a palette bound to ⌘K. */
function matchesHotkey(e: globalThis.KeyboardEvent, hotkey: CommandHotkey, mac: boolean) {
  if (fromIme(e)) return false;
  const mod = mac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
  if (!!hotkey.mod !== mod) return false;
  if (!hotkey.mod && (e.metaKey || e.ctrlKey)) return false;
  // A key without ⌘ / Ctrl / Alt is typed text inside a field, never the hotkey (WCAG 2.1.4).
  const target = e.target as HTMLElement | null;
  if (!hotkey.mod && !hotkey.alt && target?.closest?.('input, textarea, select, [contenteditable]'))
    return false;
  if (!!hotkey.shift !== e.shiftKey || !!hotkey.alt !== e.altKey) return false;
  const want = hotkey.key.toLowerCase();
  // With ⌥ a Mac types another character (⌥K is "˚"), so fall back to the physical key.
  return (
    e.key.toLowerCase() === want || (want.length === 1 && e.code === `Key${want.toUpperCase()}`)
  );
}

/**
 * 項目を探して実行する。group ごとの順を保ち、全角と半角・カタカナとひらがな・大文字と小文字の違いを無視して、
 * 名前・読み・探し言葉・補足で絞り込みます。
 */
export function filterCommands(items: CommandItem[], query: string) {
  const q = toSearchKey(query);
  const order: string[] = [];
  const byGroup = new Map<string, CommandItem[]>();
  for (const item of items) {
    const words = [item.label, item.kana, item.description, ...(item.keywords ?? [])];
    if (q && !words.some((w) => w !== undefined && toSearchKey(w).includes(q))) continue;
    const g = item.group ?? '';
    if (!byGroup.has(g)) {
      byGroup.set(g, []);
      order.push(g);
    }
    byGroup.get(g)!.push(item);
  }
  return order.flatMap((g) => byGroup.get(g)!);
}

const firstEnabled = (items: CommandItem[]) => items.findIndex((i) => !i.disabled);

/**
 * キーの近道（既定は ⌘K / Ctrl+K）で開く、コマンドを探して実行するパレット。
 * 開くと入力欄にフォーカスし、打つと絞り込みます。↑↓ で項目を移り、Enter で実行し、Esc で閉じます。最初に選べる項目を選びかけにしておきます。
 * 入力欄は combobox、一覧は listbox で、まとまりは group と見出しで伝えます。項目の数を読み上げます。日本語の変換中は、絞り込みも実行も閉じもしません。
 * 閉じると、フォーカスは開く前にあった場所（なければ開くボタン）へ戻ります。枠は Dialog と同じです。
 */
export function CommandPalette({
  items,
  label = 'コマンド',
  placeholder = 'コマンドを探す',
  hotkey = DEFAULT_COMMAND_HOTKEY,
  trigger,
  open,
  defaultOpen = false,
  onOpenChange,
  onSelect,
  emptyText = '一致するコマンドがありません',
}: CommandPaletteProps) {
  const [inner, setInner] = useState(defaultOpen);
  const isOpen = open ?? inner;
  const openRef = useRef(isOpen);
  openRef.current = isOpen;
  const setOpen = (next: boolean) => {
    if (open === undefined) setInner(next);
    onOpenChange?.(next);
  };
  const setOpenRef = useRef(setOpen);
  setOpenRef.current = setOpen;
  // Where the focus was before opening, and the command to run once it is back there.
  const opener = useRef<HTMLElement | null>(null);
  const pending = useRef<CommandItem | null>(null);
  // Before Radix moves the focus into the palette (its effects run after this layout effect).
  useLayoutEffect(() => {
    if (isOpen) opener.current = document.activeElement as HTMLElement | null;
  }, [isOpen]);
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(isMac()), []);

  const hotkeyRef = useRef(hotkey);
  hotkeyRef.current = hotkey;
  const listening = !!hotkey;
  useEffect(() => {
    if (!listening) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      const keys = hotkeyRef.current;
      if (!keys || e.repeat || !matchesHotkey(e, keys, isMac())) return;
      // The browser's own ⌘K / Ctrl+K (the address bar's search) gives way to the palette.
      e.preventDefault();
      setOpenRef.current(!openRef.current);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [listening]);

  const keys = hotkey ? describeHotkey(hotkey, mac) : undefined;
  const defaultTrigger = (
    <Button aria-keyshortcuts={keys?.aria} icon={<Search size={16} aria-hidden />}>
      コマンドを探す
      {keys && (
        <span aria-hidden className="lv-command-palette-key">
          <Kbd>{keys.label}</Kbd>
        </span>
      )}
    </Button>
  );
  const shownTrigger = trigger === undefined ? defaultTrigger : trigger;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={setOpen}>
      {shownTrigger && <DialogPrimitive.Trigger asChild>{shownTrigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal>
        <PortalSurface>
          <DialogPrimitive.Overlay className="lv-dialog-overlay" />
          <DialogPrimitive.Content
            className="lv-dialog lv-command-palette"
            onCloseAutoFocus={(e) => {
              const back = opener.current;
              if (back && back.isConnected && back !== document.body) {
                e.preventDefault();
                back.focus();
              }
              // Otherwise Radix puts the focus on the trigger.
              const command = pending.current;
              pending.current = null;
              if (command) {
                command.onSelect?.();
                onSelect?.(command.value);
              }
            }}
            // Radix reads Esc on the document and doesn't check the IME: cancelling a
            // conversion must not close the palette.
            onEscapeKeyDown={(e) => fromIme(e) && e.preventDefault()}
          >
            <DialogPrimitive.Title asChild>
              <VisuallyHidden>{label}</VisuallyHidden>
            </DialogPrimitive.Title>
            <DialogPrimitive.Description asChild>
              <VisuallyHidden>
                上下の矢印キーで選び、Enter で実行し、Esc で閉じます。
              </VisuallyHidden>
            </DialogPrimitive.Description>
            <PaletteBody
              items={items}
              label={label}
              placeholder={placeholder}
              emptyText={emptyText}
              onChoose={(item) => {
                pending.current = item;
                setOpen(false);
              }}
            />
          </DialogPrimitive.Content>
        </PortalSurface>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

type BodyProps = {
  items: CommandItem[];
  label: string;
  placeholder: string;
  emptyText: string;
  onChoose: (item: CommandItem) => void;
};
// Mounted only while open, so every opening starts with an empty field and the first command.
function PaletteBody({ items, label, placeholder, emptyText, onChoose }: BodyProps) {
  // The text that filters: committed text only, never the text still being converted.
  const [query, setQuery] = useState('');
  const composing = useRef(false);
  const shown = useMemo(() => filterCommands(items, query), [items, query]);
  const cb = useCombobox<CommandItem>({
    items: shown,
    isOpen: true,
    // Nothing stays chosen: every choice is a change, so choosing the same command twice runs it
    // twice.
    selectedItem: null,
    itemToString: (i) => i?.label ?? '',
    itemToKey: (i) => i?.value ?? null,
    isItemDisabled: (i) => !!i?.disabled,
    initialHighlightedIndex: firstEnabled(shown),
    stateReducer: (state, { type, changes }) => {
      const { InputBlur, InputClick } = useCombobox.stateChangeTypes;
      // The list never closes, so pressing the field toggles nothing; and leaving it (closing
      // the palette, the window losing focus) neither runs a command nor writes one's name in.
      if (type === InputBlur || type === InputClick) return state;
      // Choosing keeps the typed text instead of writing the command's name into the field.
      if (changes.selectedItem) return { ...changes, inputValue: state.inputValue };
      return changes;
    },
    onSelectedItemChange: ({ selectedItem }) => selectedItem && onChoose(selectedItem),
    onInputValueChange: ({ inputValue }) => {
      if (!composing.current) setQuery(inputValue ?? '');
    },
  });
  // Narrowing the list puts the first command it still has under the cursor, so Enter runs the
  // best match.
  const { setHighlightedIndex } = cb;
  useEffect(() => setHighlightedIndex(firstEnabled(shown)), [shown, setHighlightedIndex]);

  const onCompositionEnd = (e: CompositionEvent<HTMLInputElement>) => {
    composing.current = false;
    setQuery(e.currentTarget.value);
  };
  // Keys of the conversion never reach Downshift: no moving or running mid-word.
  const onKeyDownCapture = (e: KeyboardEvent) => {
    if (composing.current || fromIme(e.nativeEvent)) e.stopPropagation();
  };

  const choosable = shown.filter((i) => !i.disabled).length;
  const groups: { name: string; items: { item: CommandItem; index: number }[] }[] = [];
  shown.forEach((item, index) => {
    const name = item.group ?? '';
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.items.push({ item, index });
    else groups.push({ name, items: [{ item, index }] });
  });
  const menu = cb.getMenuProps({ 'aria-label': label });
  const option = ({ item, index }: { item: CommandItem; index: number }) => (
    <li
      key={item.value}
      className="lv-select-item lv-command-palette-item"
      data-highlighted={cb.highlightedIndex === index ? '' : undefined}
      data-disabled={item.disabled ? '' : undefined}
      {...cb.getItemProps({ item, index })}
    >
      <span className="lv-command-palette-text">
        <span>{item.label}</span>
        {item.description && (
          <span className="lv-command-palette-description">{item.description}</span>
        )}
      </span>
      {item.shortcut && (
        <span aria-hidden className="lv-command-palette-key">
          <Kbd>{item.shortcut}</Kbd>
        </span>
      )}
    </li>
  );

  return (
    <>
      <div className="lv-command-palette-search" onKeyDownCapture={onKeyDownCapture}>
        <div className="lv-input-wrap">
          <span className="lv-input-icon" aria-hidden>
            <Search />
          </span>
          <input
            className="lv-input lv-input--icon lv-control--lg"
            placeholder={placeholder}
            {...cb.getInputProps({
              'aria-label': label,
              onCompositionStart: () => {
                composing.current = true;
              },
              onCompositionEnd,
              onKeyDown: (e) => {
                // Radix's layer closed the palette on this Esc already; Downshift needn't also
                // clear the text.
                if (e.key === 'Escape')
                  (
                    e.nativeEvent as unknown as { preventDownshiftDefault?: boolean }
                  ).preventDownshiftDefault = true;
              },
            })}
          />
        </div>
      </div>
      <ul {...menu} className="lv-command-palette-list">
        {groups.map((group, g) =>
          group.name ? (
            <li key={`g${g}`} role="presentation" className="lv-command-palette-group">
              <div aria-hidden id={`${menu.id}-group-${g}`} className="lv-select-label">
                {group.name}
              </div>
              <ul role="group" aria-labelledby={`${menu.id}-group-${g}`}>
                {group.items.map(option)}
              </ul>
            </li>
          ) : (
            group.items.map(option)
          ),
        )}
        {shown.length === 0 && (
          <li className="lv-combobox-empty" role="presentation">
            {emptyText}
          </li>
        )}
      </ul>
      <VisuallyHidden role="status" aria-live="polite">
        {choosable ? `${choosable}件のコマンドがあります` : emptyText}
      </VisuallyHidden>
      <div className="lv-command-palette-footer" aria-hidden>
        <span>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          選ぶ
        </span>
        <span>
          <Kbd>Enter</Kbd>
          実行
        </span>
        <span>
          <Kbd>Esc</Kbd>
          閉じる
        </span>
      </div>
    </>
  );
}
