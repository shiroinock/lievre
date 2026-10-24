// Ariakit で作った Combobox。shell='radix' のときは、枠を Radix の Popover にして重なりを Radix に任せる。
import { useMemo, useRef, useState } from 'react';
import {
  Combobox,
  ComboboxDisclosure,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxPopover,
  ComboboxProvider,
} from '@ariakit/react';
import { Check, ChevronDown } from 'lucide-react';
import {
  filterOptions,
  RadixShell,
  useFieldIds,
  useQuery,
  useSurfaceContainer,
  type ComboboxProps,
} from './shared';

export function AriakitCombobox({
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
  const { input, query, change, setBoth, ime } = useQuery(imeGuard);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [container, portal] = useSurfaceContainer();
  const selected = options.find((o) => o.value === value) ?? null;
  const items = useMemo(
    () => (selected && query === selected.label ? options : filterOptions(options, query)),
    [options, query, selected],
  );
  const list = (
    <>
      {items.map((o) => (
        <ComboboxItem
          key={o.value}
          value={o.label}
          disabled={o.disabled}
          className="k-combobox-item"
          aria-selected={o.value === value}
        >
          <span>{o.label}</span>
          {o.value === value && <Check size={14} className="k-combobox-check" />}
        </ComboboxItem>
      ))}
      {items.length === 0 && <div className="k-combobox-empty">{emptyText}</div>}
    </>
  );
  const field = (
    <div className="k-combobox" ref={anchorRef} {...ime.wrapperHandlers}>
      <Combobox
        id={id}
        className="k-input k-combobox-input"
        placeholder={placeholder}
        aria-invalid={!!error || undefined}
        aria-describedby={error || hint ? descriptionId : undefined}
        aria-required={required || undefined}
        {...ime.inputHandlers}
      />
      <ComboboxDisclosure className="k-combobox-button" aria-label="候補を開く">
        <ChevronDown size={16} />
      </ComboboxDisclosure>
    </div>
  );
  return (
    <ComboboxProvider
      value={input}
      setValue={change}
      selectedValue={selected?.label ?? ''}
      setSelectedValue={(labelValue) => {
        const next = options.find((o) => o.label === labelValue) ?? null;
        onValueChange?.(next?.value ?? null);
        setBoth(next?.label ?? '');
      }}
      open={open}
      setOpen={setOpen}
    >
      {portal}
      <div className="k-field">
        <ComboboxLabel className="k-label">
          {label}
          {required && (
            <span aria-hidden className="k-required">
              {' '}
              *
            </span>
          )}
        </ComboboxLabel>
        {shell === 'own' ? (
          <>
            {field}
            <ComboboxPopover
              className="k-combobox-popover k-combobox-list"
              gutter={5}
              sameWidth
              portal
              portalElement={container}
            >
              {list}
            </ComboboxPopover>
          </>
        ) : (
          <>
            {field}
            <RadixShell open={open} onOpenChange={setOpen} anchor={anchorRef}>
              <ComboboxList className="k-combobox-list">{list}</ComboboxList>
            </RadixShell>
          </>
        )}
        {(error || hint) && (
          <p id={descriptionId} className={error ? 'k-field-hint k-field-error' : 'k-field-hint'}>
            {error || hint}
          </p>
        )}
      </div>
    </ComboboxProvider>
  );
}
