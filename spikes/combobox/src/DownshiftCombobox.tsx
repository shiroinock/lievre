// Downshift（useCombobox）で作った Combobox。Downshift は状態とキーボードと ARIA だけを持つので、
// 位置は floating-ui、ポータルは PortalSurface を自分で組む。shell='radix' では枠を Radix の Popover にする。
import { useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCombobox } from 'downshift';
import { autoUpdate, flip, offset, size, useFloating } from '@floating-ui/react-dom';
import { Check, ChevronDown } from 'lucide-react';
import {
  filterOptions,
  RadixShell,
  useFieldIds,
  useQuery,
  useSurfaceContainer,
  type ComboboxOption,
  type ComboboxProps,
} from './shared';

export function DownshiftCombobox({
  label,
  options,
  value,
  onValueChange,
  placeholder,
  hint,
  error,
  required,
  emptyText = '一致する候補がありません',
  imeGuard = true,
  shell = 'own',
}: ComboboxProps) {
  const { id, descriptionId } = useFieldIds();
  const { query, change, ime } = useQuery(imeGuard);
  const [container, portal] = useSurfaceContainer();
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((o) => o.value === value) ?? null;
  const items = useMemo(
    () => (selected && query === selected.label ? options : filterOptions(options, query)),
    [options, query, selected],
  );
  const cb = useCombobox<ComboboxOption>({
    items,
    itemToString: (o) => o?.label ?? '',
    isItemDisabled: (o) => !!o.disabled,
    selectedItem: selected,
    onSelectedItemChange: ({ selectedItem }) => onValueChange?.(selectedItem?.value ?? null),
    // inputValue は Downshift に持たせる。制御すると、変換中に値の書き戻しが1回遅れて
    // IME の変換の範囲が崩れる（Chromium の IME の経路で「ととうとうきょう東京」のように重なる）。
    onInputValueChange: ({ inputValue }) => change(inputValue ?? ''),
    inputId: id,
  });
  const floating = useFloating({
    open: cb.isOpen,
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(5),
      flip(),
      size({
        apply({ rects, availableHeight, elements }) {
          elements.floating.style.minWidth = `${rects.reference.width}px`;
          elements.floating.style.maxHeight = `${Math.max(120, availableHeight - 8)}px`;
        },
      }),
    ],
  });
  const options_ = items.map((o, index) => (
    <li
      key={o.value}
      className="lv-combobox-item"
      data-highlighted={cb.highlightedIndex === index || undefined}
      {...cb.getItemProps({ item: o, index })}
    >
      <span>{o.label}</span>
      {o.value === value && <Check size={14} className="lv-combobox-check" />}
    </li>
  ));
  const empty = items.length === 0 && (
    <li className="lv-combobox-empty" role="presentation">
      {emptyText}
    </li>
  );
  const field = (
    <div
      className="lv-combobox"
      ref={(el) => {
        anchorRef.current = el;
        floating.refs.setReference(el);
      }}
      {...ime.wrapperHandlers}
    >
      <input
        className="lv-input lv-combobox-input"
        placeholder={placeholder}
        aria-invalid={!!error || undefined}
        aria-describedby={error || hint ? descriptionId : undefined}
        aria-required={required || undefined}
        {...cb.getInputProps({
          ...ime.inputHandlers,
          // Radix の枠が先に Esc で閉じた（preventDefault した）ときは、Downshift の「閉じている時の Esc＝文字を消す」を走らせない。
          onKeyDown: (e) => {
            if (e.key === 'Escape' && e.nativeEvent.defaultPrevented)
              (
                e.nativeEvent as KeyboardEvent & { preventDownshiftDefault?: boolean }
              ).preventDownshiftDefault = true;
          },
        })}
      />
      <button
        type="button"
        className="lv-combobox-button"
        aria-label="候補を開く"
        {...cb.getToggleButtonProps()}
      >
        <ChevronDown size={16} />
      </button>
    </div>
  );
  return (
    <div className="lv-field">
      {portal}
      <label className="lv-label" {...cb.getLabelProps()}>
        {label}
        {required && (
          <span aria-hidden className="lv-required">
            {' '}
            *
          </span>
        )}
      </label>
      {shell === 'own' ? (
        <>
          {field}
          {container ? (
            createPortal(
              <ul
                className="lv-combobox-popover lv-combobox-list"
                hidden={!cb.isOpen}
                {...cb.getMenuProps({
                  ref: floating.refs.setFloating,
                  style: floating.floatingStyles,
                })}
              >
                {cb.isOpen && options_}
                {cb.isOpen && empty}
              </ul>,
              container,
            )
          ) : (
            // 最初の描画ではポータルの入れ物がまだない。Downshift は menu の要素を毎回要るので、仮に置く。
            <ul hidden {...cb.getMenuProps({}, { suppressRefError: true })} />
          )}
        </>
      ) : (
        <>
          {field}
          {/* Downshift は閉じているときも menu の要素を要るので、閉じた間は空の ul を置いておく。 */}
          {!cb.isOpen && <ul hidden {...cb.getMenuProps({}, { suppressRefError: true })} />}
          <RadixShell
            open={cb.isOpen}
            onOpenChange={(open) => (open ? cb.openMenu() : cb.closeMenu())}
            anchor={anchorRef}
          >
            <ul className="lv-combobox-list" {...cb.getMenuProps({}, { suppressRefError: true })}>
              {options_}
              {empty}
            </ul>
          </RadixShell>
        </>
      )}
      {(error || hint) && (
        <p id={descriptionId} className={error ? 'lv-field-hint lv-field-error' : 'lv-field-hint'}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
