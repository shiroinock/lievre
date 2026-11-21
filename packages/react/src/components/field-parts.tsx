// Small pieces shared by the form parts. Not exported from the package.
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
