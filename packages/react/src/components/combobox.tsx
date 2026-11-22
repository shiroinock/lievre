// Single-choice combobox. Downshift holds the state, the keys and the ARIA; the list's layer is
// Radix's Popover, so Esc, outside clicks and stacking follow Select and Dialog (see
// docs/combobox-foundation.md). lievre adds what neither does: the IME guard, width- and
// kana-blind matching, and the count of options read out.
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CompositionEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import { useCombobox } from 'downshift';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { Check, ChevronDown } from 'lucide-react';
import { cx, PortalSurface } from './system';
import { Field } from './form';
import { VisuallyHidden } from './primitives';
import { toSearchKey } from './normalize';

export type ComboboxOption = {
  value: string;
  label: string;
  /** 読み（ひらがな）。漢字の名前を、読みでも探せるようにします（「とうきょう」で「東京商事」）。 */
  kana?: string;
  disabled?: boolean;
};
export type ComboboxProps = {
  label: string;
  options: ComboboxOption[];
  /** 選んでいる値。未選択は null。渡すと外で持ちます。 */
  value?: string | null;
  /** 外で持たないときの、はじめの値。 */
  defaultValue?: string | null;
  /** 選んだ値が変わったときに呼びます。文字を消して空にすると null で呼びます。 */
  onValueChange?: (value: string | null) => void;
  /** 何も入れていないときの文字。 */
  placeholder?: string;
  /** 補助文。入力欄の下に出し、aria-describedby で結びます。 */
  hint?: string;
  /** エラー文。記号を添えて出し、aria-invalid と aria-describedby を付けます。 */
  error?: string;
  /** ラベルの横に「必須」の文字を出し、aria-required を付けます。 */
  required?: boolean;
  disabled?: boolean;
  /** フォームで送るときの名前。選んだ値を隠した入力で送ります。 */
  name?: string;
  /** 入力欄の id。省くと部品が作ります。 */
  id?: string;
  /** 高さは Select・TextField と同じ段です。 */
  controlSize?: 'sm' | 'md' | 'lg';
  /** 一致する候補がないときの文。 */
  emptyText?: string;
};

/** Scrolls the list just enough to show the highlighted option, without moving the page. */
function reveal(layer: HTMLElement | null) {
  const list = layer?.querySelector<HTMLElement>('.lv-combobox-list');
  const option = list?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
  if (!list || !option) return;
  const view = list.getBoundingClientRect();
  const box = option.getBoundingClientRect();
  if (box.top < view.top) list.scrollTop -= view.top - box.top;
  else if (box.bottom > view.bottom) list.scrollTop += box.bottom - view.bottom;
}

/** Whether a key belongs to the IME: Chrome sends the committing Enter with isComposing,
 * Safari sends it after compositionend with keyCode 229. */
const fromIme = (e: { isComposing?: boolean; keyCode?: number }) =>
  !!e.isComposing || e.keyCode === 229;

/** 打った文字で候補を絞ります（Combobox の中と同じ絞り込み）。全角と半角・カタカナとひらがな・大文字と小文字・空白の違いを無視し、名前（label）か読み（kana）に含むものを返します。空の文字なら全件を返します。 */
export function filterOptions(options: ComboboxOption[], query: string) {
  const q = toSearchKey(query);
  if (!q) return options;
  return options.filter(
    (o) =>
      toSearchKey(o.label).includes(q) || (o.kana !== undefined && toSearchKey(o.kana).includes(q)),
  );
}

/**
 * 候補を打って絞り込み、1つを選ぶ入力（取引先・担当者・品目など、Select では探しにくい数のとき）。
 * 絞り込みは全角と半角・カタカナとひらがな・大文字と小文字の違いを無視し、読み（kana）でも探せます。
 * 日本語の変換中は絞り込みも確定もしません。矢印キーで候補を移り、Enter で選び、Esc で一覧を閉じます（もう一度で文字を消します）。
 * 選べる候補の数を読み上げます。離れたときに文字が選んだ候補と合わなければ、選んだ候補の名前に戻します。props の名前は Select と同じで、未選択は null です。
 */
export function Combobox({
  label,
  options,
  value,
  defaultValue = null,
  onValueChange,
  placeholder,
  hint,
  error,
  required,
  disabled,
  name,
  id,
  controlSize = 'md',
  emptyText = '一致する候補がありません',
}: ComboboxProps) {
  const [inner, setInner] = useState<string | null>(defaultValue);
  const current = value !== undefined ? value : inner;
  // The value as of the last choice in this event: Downshift can report one clearing twice
  // (the selected item and the emptied text), and only the first reaches the caller.
  const latest = useRef(current);
  latest.current = current;
  const choose = (next: string | null) => {
    if (next === latest.current) return;
    latest.current = next;
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  };
  const selected = options.find((o) => o.value === current) ?? null;
  // The text that filters: committed text only, never the text still being converted.
  const [query, setQuery] = useState('');
  const composing = useRef(false);
  const anchor = useRef<HTMLDivElement>(null);
  const items = useMemo(
    () => (selected && query === selected.label ? options : filterOptions(options, query)),
    [options, query, selected],
  );
  const onCompositionEnd = useCallback((e: CompositionEvent<HTMLInputElement>) => {
    composing.current = false;
    setQuery(e.currentTarget.value);
  }, []);
  return (
    <Field {...{ label, hint, error, required, id }}>
      {(control) => (
        <ComboboxControl
          {...{ control, items, selected, placeholder, disabled, name, controlSize, emptyText }}
          // The form sends the value held, even one no option names yet.
          value={current}
          anchor={anchor}
          composing={composing}
          onCompositionEnd={onCompositionEnd}
          onQuery={(text, typed) => {
            if (!composing.current) setQuery(text);
            // Emptying the field by typing clears the choice. Downshift also empties it when the
            // value from outside names no option: that is not the user's doing, so nothing is sent.
            if (typed && text === '') choose(null);
          }}
          onSelect={(option) => choose(option?.value ?? null)}
        />
      )}
    </Field>
  );
}

type ControlProps = {
  control: {
    id: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
    required?: boolean;
  };
  items: ComboboxOption[];
  selected: ComboboxOption | null;
  value: string | null;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  controlSize: 'sm' | 'md' | 'lg';
  emptyText: string;
  anchor: RefObject<HTMLDivElement | null>;
  composing: RefObject<boolean>;
  onCompositionEnd: (e: CompositionEvent<HTMLInputElement>) => void;
  onQuery: (text: string, typed: boolean) => void;
  onSelect: (option: ComboboxOption | null) => void;
};
function ComboboxControl({
  control,
  items,
  selected,
  value,
  placeholder,
  disabled,
  name,
  controlSize,
  emptyText,
  anchor,
  composing,
  onCompositionEnd,
  onQuery,
  onSelect,
}: ControlProps) {
  const { id, required, ...described } = control;
  const choosable = items.filter((o) => !o.disabled).length;
  const content = useRef<HTMLDivElement>(null);
  const cb = useCombobox<ComboboxOption>({
    items,
    itemToString: (o) => o?.label ?? '',
    isItemDisabled: (o) => !!o.disabled,
    selectedItem: selected,
    // By value: options written inline are new objects on every render of the parent, and a new
    // object would count as a new choice and overwrite the text being typed.
    itemToKey: (o) => o?.value ?? null,
    // Leaving without choosing puts back the chosen option's name, so the text never shows one
    // thing while the field holds another.
    stateReducer: (state, { type, changes }) =>
      type === useCombobox.stateChangeTypes.InputBlur && changes.selectedItem === state.selectedItem
        ? { ...changes, inputValue: state.selectedItem?.label ?? '' }
        : changes,
    onSelectedItemChange: ({ selectedItem }) => onSelect(selectedItem ?? null),
    // Downshift keeps the text. Controlling it delays the write-back during conversion by one
    // render and breaks the IME's range (「ととうとうきょう東京」).
    onInputValueChange: ({ inputValue, type }) =>
      onQuery(inputValue ?? '', type === useCombobox.stateChangeTypes.InputChange),
    inputId: id,
    labelId: `${id}-label`,
    menuId: `${id}-list`,
    toggleButtonId: `${id}-toggle`,
  });
  const inside = (target: EventTarget | null) =>
    target instanceof Node &&
    !!(anchor.current?.contains(target) || content.current?.contains(target));
  // Keys of the conversion never reach Downshift: no filtering, moving or choosing mid-word.
  const onKeyDownCapture = (e: KeyboardEvent) => {
    if (composing.current || fromIme(e.nativeEvent)) e.stopPropagation();
  };
  const list = items.map((option, index) => (
    <li
      key={option.value}
      className="lv-select-item"
      data-highlighted={cb.highlightedIndex === index ? '' : undefined}
      data-state={option.value === selected?.value ? 'checked' : undefined}
      data-disabled={option.disabled ? '' : undefined}
      {...cb.getItemProps({ item: option, index })}
    >
      <span>{option.label}</span>
      {option.value === selected?.value && (
        <span className="lv-select-indicator" aria-hidden>
          <Check size={14} />
        </span>
      )}
    </li>
  ));
  return (
    <>
      <div
        ref={anchor}
        className={cx('lv-combobox', controlSize !== 'md' && `lv-combobox--${controlSize}`)}
        onKeyDownCapture={onKeyDownCapture}
      >
        <input
          className={cx(
            'lv-input',
            'lv-combobox-input',
            controlSize !== 'md' && `lv-control--${controlSize}`,
          )}
          placeholder={placeholder}
          disabled={disabled}
          aria-required={required}
          {...described}
          {...cb.getInputProps({
            onCompositionStart: () => {
              composing.current = true;
            },
            onCompositionEnd,
            // Leaving with the list closed: Downshift does nothing then, so put the chosen name
            // back here. With the list open, Downshift's own blur (the reducer above) does it.
            onBlur: (e) => {
              // Moving within the combobox (its button, its list) is not leaving it.
              if (inside(e.relatedTarget)) return;
              const label = selected?.label ?? '';
              if (!cb.isOpen && cb.inputValue !== label) cb.setInputValue(label);
            },
            onKeyDown: (e) => {
              // Radix's layer closed the list on this Esc already; don't also clear the text.
              if (e.key === 'Escape' && e.nativeEvent.defaultPrevented)
                (
                  e.nativeEvent as unknown as { preventDownshiftDefault?: boolean }
                ).preventDownshiftDefault = true;
            },
          })}
        />
        <button
          type="button"
          className="lv-combobox-button"
          aria-label="候補を開く"
          disabled={disabled}
          {...cb.getToggleButtonProps({
            // Keep the focus in the input: pressing the button would move it there in Chrome
            // and Firefox on Windows, and the input's blur would put back the chosen name.
            onMouseDown: (e) => e.preventDefault(),
          })}
        >
          <ChevronDown size={16} aria-hidden />
        </button>
      </div>
      {name && <input type="hidden" name={name} value={value ?? ''} disabled={disabled} />}
      <VisuallyHidden role="status" aria-live="polite">
        {cb.isOpen ? (choosable ? `${choosable}件の候補があります` : emptyText) : ''}
      </VisuallyHidden>
      {/* Downshift wants the menu element on every render; while closed it is an empty list. */}
      {!cb.isOpen && <ul hidden {...cb.getMenuProps({}, { suppressRefError: true })} />}
      <PopoverPrimitive.Root
        open={cb.isOpen}
        onOpenChange={(open) => (open ? cb.openMenu() : cb.closeMenu())}
      >
        <PopoverPrimitive.Anchor virtualRef={anchor as RefObject<HTMLElement>} />
        <PopoverPrimitive.Portal>
          <PortalSurface>
            <PopoverPrimitive.Content
              ref={content}
              // The list inside is the listbox; the layer itself is not a dialog.
              role="presentation"
              // Pressing the list's padding or the empty line would focus the layer (it has
              // tabIndex -1) and take the focus out of the input; keep it there.
              onMouseDown={(e) => e.preventDefault()}
              className="lv-select-content lv-combobox-content"
              data-size={controlSize}
              sideOffset={5}
              align="start"
              // The focus stays in the input: opening and closing don't move it. Radix fills the
              // portal a commit after Downshift scrolled to the highlighted option, so scroll
              // again once the list is there and placed.
              onOpenAutoFocus={(e) => {
                e.preventDefault();
                requestAnimationFrame(() => reveal(content.current));
              }}
              onCloseAutoFocus={(e) => e.preventDefault()}
              // The input, the button and the list are not "outside".
              onFocusOutside={(e) => inside(e.target) && e.preventDefault()}
              onPointerDownOutside={(e) => inside(e.target) && e.preventDefault()}
              // Radix reads Esc on the document and doesn't check the IME: cancelling a
              // conversion must not close the list.
              onEscapeKeyDown={(e) => fromIme(e) && e.preventDefault()}
            >
              <ul className="lv-combobox-list" {...cb.getMenuProps({}, { suppressRefError: true })}>
                {list}
                {items.length === 0 && (
                  <li className="lv-combobox-empty" role="presentation">
                    {emptyText}
                  </li>
                )}
              </ul>
            </PopoverPrimitive.Content>
          </PortalSurface>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </>
  );
}
