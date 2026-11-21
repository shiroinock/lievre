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

/** Whether a key belongs to the IME: Chrome sends the committing Enter with isComposing,
 * Safari sends it after compositionend with keyCode 229. */
const fromIme = (e: { isComposing?: boolean; keyCode?: number }) =>
  !!e.isComposing || e.keyCode === 229;

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
 * 候補の数を読み上げます。props は Select と同じ形です。
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
  const choose = (next: string | null) => {
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
          anchor={anchor}
          composing={composing}
          onCompositionEnd={onCompositionEnd}
          onQuery={(text) => {
            if (!composing.current) setQuery(text);
            // Emptying the field clears the choice.
            if (text === '' && selected) choose(null);
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
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  controlSize: 'sm' | 'md' | 'lg';
  emptyText: string;
  anchor: RefObject<HTMLDivElement | null>;
  composing: RefObject<boolean>;
  onCompositionEnd: (e: CompositionEvent<HTMLInputElement>) => void;
  onQuery: (text: string) => void;
  onSelect: (option: ComboboxOption | null) => void;
};
function ComboboxControl({
  control,
  items,
  selected,
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
  const content = useRef<HTMLDivElement>(null);
  const cb = useCombobox<ComboboxOption>({
    items,
    itemToString: (o) => o?.label ?? '',
    isItemDisabled: (o) => !!o.disabled,
    selectedItem: selected,
    onSelectedItemChange: ({ selectedItem }) => onSelect(selectedItem ?? null),
    // Downshift keeps the text. Controlling it delays the write-back during conversion by one
    // render and breaks the IME's range (「ととうとうきょう東京」).
    onInputValueChange: ({ inputValue }) => onQuery(inputValue ?? ''),
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
          {...cb.getToggleButtonProps()}
        >
          <ChevronDown size={16} aria-hidden />
        </button>
      </div>
      {name && <input type="hidden" name={name} value={selected?.value ?? ''} />}
      <VisuallyHidden role="status" aria-live="polite">
        {cb.isOpen ? (items.length ? `${items.length}件の候補があります` : emptyText) : ''}
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
              className="lv-select-content lv-combobox-content"
              data-size={controlSize}
              sideOffset={5}
              align="start"
              // The focus stays in the input: opening and closing don't move it.
              onOpenAutoFocus={(e) => e.preventDefault()}
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
