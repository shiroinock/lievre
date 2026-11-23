// Known misses, measured on main before the gate existed. Each entry needs a reason.
// Delete an entry once the part is fixed: the gate then holds that part to the criterion,
// and it fails if an entry here no longer happens.
export type Combo = {
  theme: 'paper' | 'ink';
  density: 'comfortable' | 'compact';
  typography: 'standard' | 'interface';
};
export type KnownIssue = {
  /** Story の meta.title */
  story: string;
  /** layoutGate.parts の name */
  part: string;
  /** 検査の名前（'inset-y'、'padding'、'icon .lv-checkbox' など） */
  check: string;
  /** その Story（export の名前）でだけ起きる場合 */
  example?: string;
  /**
   * メッセージに出る要素（button.lv-button「整える」など）がこの文字列を含むときだけ。
   * 画面の例外は、ずれる要素か Story に絞る。部品ごとに外すと、同じ画面のほかのずれも見逃す。
   */
  element?: string;
  /** この組み合わせのときだけ起きる場合 */
  when?: Partial<Combo>;
  reason: string;
};

export const BASELINE: KnownIssue[] = [];

/** 公開しているが、配置を測る部品ではないもの。 */
export const NOT_A_PART: Record<string, string> = {
  LievreProvider: '配色・密度・文字の範囲を決める入れ物。すべての Story の外側で使っている。',
  PortalSurface: 'ポータルにテーマを引き継ぐ入れ物。Dialog・Select・Tooltip の中で測っている。',
  DialogClose: 'Radix の Close をそのまま出したもの。見た目は中に置くボタンが決める。',
  DEFAULT_COMMAND_HOTKEY: 'CommandPalette を開くキーの既定値（ただの値）。描くものはない。',
};
