import { useState, type ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { cx } from './system';

type ChipBase = {
  /** チップの言葉（分類の名前や、選んだ値）。 */
  label: string;
  /** 言葉の前のアイコン。飾りなので読み上げません。選べるチップでは、選んでいる間は印に替わります。 */
  icon?: ReactNode;
  /** 'md'（既定）は 32px、'sm' は 24px の高さ。 */
  size?: 'sm' | 'md';
  disabled?: boolean;
};
export type ChipProps = ChipBase &
  (
    | {
        /** 外すボタンを付け、押すと呼びます。外したあとは、次のチップか入力欄へフォーカスを移してください。 */
        onRemove?: () => void;
        /** 外すボタンの読み上げ。既定は「{label}を外す」。 */
        removeLabel?: string;
        selected?: never;
        defaultSelected?: never;
        onSelectedChange?: never;
      }
    | {
        onRemove?: never;
        removeLabel?: never;
        /** 選んでいるか。渡すと外で持ち、チップは押すと入り切りするボタン（aria-pressed）になります。 */
        selected?: boolean;
        /** 外で持たないときの、はじめの選択。 */
        defaultSelected?: boolean;
        /** 選択が変わったときに呼びます。これか selected・defaultSelected を渡すと、選べるチップになります。 */
        onSelectedChange?: (selected: boolean) => void;
      }
  );
/**
 * 分類や選んだ値を示す小さな札。状態（稼働中・要確認）は Badge、分類と選んだ値は Chip を使います。
 * 何も渡さなければ表示だけの札（タグ）、onRemove で外せる札（選んだ絞り込みの条件、複数選択の値）、
 * selected・onSelectedChange で押して入り切りする絞り込みの札になります。選んでいる札は、面と線の色に加えて印で示します。
 */
export function Chip(props: ChipProps) {
  const { label, icon, size = 'md', disabled } = props;
  const selectable =
    props.selected !== undefined ||
    props.defaultSelected !== undefined ||
    props.onSelectedChange !== undefined;
  const [inner, setInner] = useState(props.defaultSelected ?? false);
  const className = cx('lv-chip', size === 'sm' && 'lv-chip--sm');
  if (selectable) {
    const selected = props.selected ?? inner;
    return (
      <button
        type="button"
        className={cx(className, 'lv-chip--selectable')}
        aria-pressed={selected}
        disabled={disabled}
        onClick={() => {
          if (props.selected === undefined) setInner(!selected);
          props.onSelectedChange?.(!selected);
        }}
      >
        {selected ? (
          <Check className="lv-chip-mark" size={16} aria-hidden />
        ) : (
          icon && (
            <span className="lv-chip-icon" aria-hidden>
              {icon}
            </span>
          )
        )}
        <span className="lv-chip-label">{label}</span>
      </button>
    );
  }
  return (
    <span className={className} data-disabled={disabled ? '' : undefined}>
      {icon && (
        <span className="lv-chip-icon" aria-hidden>
          {icon}
        </span>
      )}
      <span className="lv-chip-label">{label}</span>
      {props.onRemove && (
        <button
          type="button"
          className="lv-chip-remove"
          aria-label={props.removeLabel ?? `${label}を外す`}
          disabled={disabled}
          onClick={props.onRemove}
        >
          <X size={16} aria-hidden />
        </button>
      )}
    </span>
  );
}
/** チップの並び。名前（label）を付けたまとまりにして、折り返して並べます。 */
export function ChipGroup({
  label,
  children,
}: {
  /** まとまりの名前。画面には出さず、読み上げに使います（「絞り込みの条件」）。 */
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="lv-chip-group" role="group" aria-label={label}>
      {children}
    </div>
  );
}
