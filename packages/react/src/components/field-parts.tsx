// Small pieces shared by the form parts. Not exported from the package.
import { useEffect, useState } from 'react';
import { CircleAlert } from 'lucide-react';

/**
 * The visible mark of a required field, in words rather than an asterisk. A single control
 * already tells assistive technology it is required (required / aria-required), so its mark is
 * hidden from them; a fieldset's legend has no such state, so its mark is read out.
 */
export function RequiredMark({ spoken = false }: { spoken?: boolean }) {
  return (
    <span className="lv-required" aria-hidden={spoken ? undefined : true}>
      必須
    </span>
  );
}

/** Hint first, then the error with its mark: both stay, and both describe the control. */
export function FieldMessages({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  return (
    <>
      {hint && (
        <p id={`${id}-hint`} className="lv-field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="lv-field-hint lv-field-error">
          <CircleAlert aria-hidden />
          <span>{error}</span>
        </p>
      )}
    </>
  );
}
/** The ids FieldMessages draws, for aria-describedby. */
export function describedBy(id: string, hint?: string, error?: string, extra?: string) {
  return (
    [hint && `${id}-hint`, error && `${id}-error`, extra].filter(Boolean).join(' ') || undefined
  );
}

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter('ja', { granularity: 'grapheme' })
    : undefined;
/** Half-width forms and ASCII are 1; everything else (kana, kanji, full-width forms) is 2. */
const cellWidth = (grapheme: string) => {
  const code = grapheme.codePointAt(0) ?? 0;
  return code <= 0x7e || (code >= 0xff61 && code <= 0xff9f) ? 1 : 2;
};
/** Counts what a person sees as one character (an emoji with modifiers is one). */
export function countCharacters(value: string, countBy: 'grapheme' | 'width' = 'grapheme') {
  const graphemes = segmenter
    ? Array.from(segmenter.segment(value), (s) => s.segment)
    : Array.from(value);
  return countBy === 'width'
    ? graphemes.reduce((sum, g) => sum + cellWidth(g), 0)
    : graphemes.length;
}
/**
 * The count under a field. The figures are for the eye; a screen reader hears the limit once
 * (through aria-describedby) and how many remain after typing pauses, not on every key.
 */
export function CharacterCount({
  id,
  count,
  limit,
  countBy,
}: {
  id: string;
  count: number;
  limit: number;
  countBy: 'grapheme' | 'width';
}) {
  const over = count > limit;
  const unit = countBy === 'width' ? '文字（全角は2と数えます）' : '文字';
  const left = over
    ? `${count - limit}${unit}多すぎます`
    : `あと${limit - count}${unit}入力できます`;
  const [spoken, setSpoken] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSpoken(left), 1000);
    return () => clearTimeout(timer);
  }, [left]);
  return (
    <div className="lv-field-count" data-over={over || undefined}>
      <span id={`${id}-limit`} className="lv-sr-only">
        {limit}
        {unit}まで入力できます
      </span>
      <span aria-hidden>
        {over && <CircleAlert />}
        <span className="lv-tabular">{count}</span> / <span className="lv-tabular">{limit}</span>
        {over && <span>（{count - limit}超過）</span>}
      </span>
      <span role="status" className="lv-sr-only">
        {spoken}
      </span>
    </div>
  );
}
