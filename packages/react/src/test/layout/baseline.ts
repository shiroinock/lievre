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

export const BASELINE: KnownIssue[] = [
  // 字形によるずれ。行の高さと padding は上下で同じ。
  {
    story: 'Components/Display/Kbd',
    part: 'キー',
    check: 'inset-y',
    reason:
      '記号（⌘ など）の字形が等幅の書体で上に寄り、上下の差の半分が 1.7px になる（基準 1.4px）。',
  },
  {
    story: 'Components/Data/DataTable',
    part: '表のセル',
    check: 'inset-y',
    reason:
      'カタカナと英字（「ストレージC」「ゲートウェイB」）や漢字だけの長い名前が、上に 1.6〜1.7px 寄る（基準 1.4px）。セルは padding 12px・行の高さ 24px で上下同じ。IBM Plex Sans JP の字形が行の中央より上にあり、1x の画面で半行送りが整数に丸められる分が足される。',
  },
  ...['Patterns/Application', 'Patterns/Everyday'].map((story) => ({
    story,
    part: 'ボタン',
    check: 'inset-y',
    element: '「整える」',
    reason:
      '資料の絞り込みの「整える」ボタンで、文字の輪郭が上に 1.5px 寄る（基準 1.4px）。同じ大きさのボタンのほかのラベルは基準内なので、「整」の字形によるずれ。',
  })),
];

/** 公開しているが、配置を測る部品ではないもの。 */
export const NOT_A_PART: Record<string, string> = {
  LievreProvider: '配色・密度・文字の範囲を決める入れ物。すべての Story の外側で使っている。',
  PortalSurface: 'ポータルにテーマを引き継ぐ入れ物。Dialog・Select・Tooltip の中で測っている。',
  DialogClose: 'Radix の Close をそのまま出したもの。見た目は中に置くボタンが決める。',
};
