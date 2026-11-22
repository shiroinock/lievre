import { Check } from 'lucide-react';
import { cx } from './system';
import { VisuallyHidden } from './primitives';

export type StepperStep = {
  /** 段の名前（「入力」「確認」「完了」）。 */
  label: string;
};
export type StepperProps = {
  /** 並びの名前。画面には出さず、読み上げに使います（「申し込みの手順」）。 */
  label: string;
  steps: StepperStep[];
  /** 今の段の番号（0 から）。これより前の段は済み、後ろはまだです。steps の数を渡すと、すべて済みになります。 */
  current: number;
  /** 'horizontal'（既定）は横に、'vertical' は縦に並べます。狭い画面や段の名前が長いときは縦に。 */
  orientation?: 'horizontal' | 'vertical';
  className?: string;
};
/**
 * 申し込みのように画面を分けた手順の、今どこにいるかを示す並び。`<ol>` で順番を伝え、今の段に aria-current="step" を付けます。
 * 済み・今・まだは色だけでなく、済みはチェックの印と「完了」、今は太い文字と塗った円で示し、読み上げでも「完了」「現在」を添えます。番号は等幅です。
 * 押して移る操作は持ちません（戻るボタンは画面の側に置きます）。
 */
export function Stepper({
  label,
  steps,
  current,
  orientation = 'horizontal',
  className,
}: StepperProps) {
  return (
    <ol
      className={cx('lv-stepper', orientation === 'vertical' && 'lv-stepper--vertical', className)}
      aria-label={label}
    >
      {steps.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'upcoming';
        return (
          <li
            key={i}
            className="lv-step"
            data-state={state}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className="lv-step-mark" aria-hidden>
              {state === 'done' ? <Check size={14} /> : i + 1}
            </span>
            <span className="lv-step-label">
              {step.label}
              {state === 'done' && <VisuallyHidden>（完了）</VisuallyHidden>}
              {state === 'current' && <VisuallyHidden>（現在）</VisuallyHidden>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
