// React Aria（react-aria-components）で作った Combobox。shell='own' は枠も React Aria の Popover、
// shell='radix' は枠を Radix の Popover にして、重なりを Radix に任せる。
import { useContext, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import {
  Button,
  ComboBox,
  ComboBoxStateContext,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Text,
} from 'react-aria-components';
import { Check, ChevronDown } from 'lucide-react';
import {
  filterOptions,
  RadixShell,
  useQuery,
  useSurfaceContainer,
  type ComboboxOption,
  type ComboboxProps,
} from './shared';

export function AriaCombobox({
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
  const { input, query, change, setBoth, ime } = useQuery(imeGuard);
  const [container, portal] = useSurfaceContainer();
  const anchorRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) ?? null;
  // 選んだ直後（入力＝選んだ名前）は、開いたときに全部を出す。
  const items = useMemo(
    () => (selected && query === selected.label ? options : filterOptions(options, query)),
    [options, query, selected],
  );
  return (
    <>
      {portal}
      <ComboBox
        className="lv-field"
        items={items}
        selectedKey={value ?? null}
        onSelectionChange={(key) => {
          const next = key === null ? null : String(key);
          onValueChange?.(next);
          setBoth(options.find((o) => o.value === next)?.label ?? '');
        }}
        inputValue={input}
        onInputChange={change}
        disabledKeys={options.filter((o) => o.disabled).map((o) => o.value)}
        isInvalid={!!error}
        isRequired={required}
        allowsEmptyCollection
        menuTrigger="input"
      >
        <Label className="lv-label">
          {label}
          {required && (
            <span aria-hidden className="lv-required">
              {' '}
              *
            </span>
          )}
        </Label>
        <div className="lv-combobox" ref={anchorRef} {...ime.wrapperHandlers}>
          <Input
            className="lv-input lv-combobox-input"
            placeholder={placeholder}
            {...ime.inputHandlers}
          />
          <Button className="lv-combobox-button" aria-label="候補を開く">
            <ChevronDown size={16} />
          </Button>
        </div>
        {(error || hint) && (
          <Text
            slot="description"
            className={error ? 'lv-field-hint lv-field-error' : 'lv-field-hint'}
          >
            {error || hint}
          </Text>
        )}
        {shell === 'own' ? (
          <Popover
            className="lv-combobox-popover"
            offset={5}
            UNSTABLE_portalContainer={container ?? undefined}
          >
            <ListBox<ComboboxOption>
              className="lv-combobox-list"
              renderEmptyState={() => <div className="lv-combobox-empty">{emptyText}</div>}
            >
              {(o) => (
                <ListBoxItem id={o.value} textValue={o.label} className="lv-combobox-item">
                  {({ isSelected }) => (
                    <>
                      <span>{o.label}</span>
                      {isSelected && <Check size={14} className="lv-combobox-check" />}
                    </>
                  )}
                </ListBoxItem>
              )}
            </ListBox>
          </Popover>
        ) : (
          <AriaRadixShell anchor={anchorRef}>
            <ListBox<ComboboxOption>
              className="lv-combobox-list"
              renderEmptyState={() => <div className="lv-combobox-empty">{emptyText}</div>}
            >
              {(o) => (
                <ListBoxItem id={o.value} textValue={o.label} className="lv-combobox-item">
                  {({ isSelected }) => (
                    <>
                      <span>{o.label}</span>
                      {isSelected && <Check size={14} className="lv-combobox-check" />}
                    </>
                  )}
                </ListBoxItem>
              )}
            </ListBox>
          </AriaRadixShell>
        )}
      </ComboBox>
    </>
  );
}

/**
 * React Aria の開閉の状態をそのまま使い、枠だけを Radix の Popover にする。
 * 試作の結果：うまく動かない。React Aria は開くときに一瞬だけ候補へフォーカスを移し、入力欄の blur で
 * 「フォーカスが自前の Popover（popoverRef）の外へ出たか」を見て閉じる。Radix の枠には popoverRef がないので、
 * 最初の矢印で開いた直後に閉じる。直すには react-aria の hooks（useComboBox）から組み直す必要がある。
 */
function AriaRadixShell({
  anchor,
  children,
}: {
  anchor: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const state = useContext(ComboBoxStateContext);
  // 候補の一覧を組み立てる下見の描画（状態がまだない）では、中身をそのまま出して候補を数えさせる。
  if (!state) return <>{children}</>;
  return (
    <RadixShell open={state.isOpen} onOpenChange={(open) => !open && state.close()} anchor={anchor}>
      {children}
    </RadixShell>
  );
}
