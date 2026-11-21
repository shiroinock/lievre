// Internal: not exported from the package.

/** Whether a key belongs to the IME: Chrome sends the committing Enter with isComposing,
 * Safari sends it after compositionend with keyCode 229. */
export const fromIme = (e: { isComposing?: boolean; keyCode?: number }) =>
  !!e.isComposing || e.keyCode === 229;
