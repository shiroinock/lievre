// Small pieces shared by the form parts. Not exported from the package.
import { useEffect, useRef, useState } from 'react';
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
/**
 * Half-width forms and ASCII are 1; everything else (kana, kanji, full-width forms) is 2.
 * A half-width (semi-)voiced mark joins the kana before it as one grapheme but takes a cell
 * of its own (ｶﾞ is two half-width cells), so it adds 1.
 */
const cellWidth = (grapheme: string) => {
  const [first = 0, ...rest] = Array.from(grapheme, (c) => c.codePointAt(0) ?? 0);
  const base = first <= 0x7e || (first >= 0xff61 && first <= 0xff9f) ? 1 : 2;
  return base + rest.filter((c) => c === 0xff9e || c === 0xff9f).length;
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
  const left = over ? `${count - limit}文字多すぎます` : `あと${limit - count}文字入力できます`;
  const [spoken, setSpoken] = useState('');
  // Nothing is said while the page loads; only a change the person made is announced.
  const initial = useRef(left);
  const changed = useRef(false);
  useEffect(() => {
    if (!changed.current && left === initial.current) return;
    changed.current = true;
    const timer = setTimeout(() => setSpoken(left), 1000);
    return () => clearTimeout(timer);
  }, [left]);
  return (
    <div className="lv-field-count" data-over={over || undefined}>
      <span id={`${id}-limit`} className="lv-sr-only">
        {limit}文字まで入力できます{countBy === 'width' && '（全角は2文字と数えます）'}
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
