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
  /** 検査の名前（'inset-y'、'padding'、'icon .k-checkbox' など） */
  check: string;
  /** この組み合わせのときだけ起きる場合 */
  when?: Partial<Combo>;
  reason: string;
};

export const BASELINE: KnownIssue[] = [
  // パネル：padding が上下と左右で違う。
  {
    story: 'Components/Feedback/Alert',
    part: 'お知らせ',
    check: 'padding-equal',
    reason: 'padding が 12px 16px。パネルの padding は上下左右で同じ値にする。',
  },
  {
    story: 'Components/Overlays/Toast',
    part: '通知',
    check: 'padding-equal',
    reason: 'padding が 12px 16px。パネルの padding は上下左右で同じ値にする。',
  },
  {
    story: 'Components/Overlays/Dialog',
    part: 'ダイアログの本文',
    check: 'padding-equal',
    reason: 'padding が 20px 24px 24px。見出しとの間を上の padding で詰めている。',
  },
  {
    story: 'Components/Overlays/Dialog',
    part: 'ダイアログの操作',
    check: 'padding-equal',
    reason: 'padding が 16px 24px。パネルの padding は上下左右で同じ値にする。',
  },

  // 上下の中央からずれる。
  {
    story: 'Components/Display/Kbd',
    part: 'キー',
    check: 'inset-y',
    reason:
      '記号（⌘ など）の字形が等幅の書体で下に寄り、上下の差の半分が 1.7px になる（基準 1.4px）。',
  },
  {
    story: 'Components/Data/DataTable',
    part: '表のセル',
    check: 'inset-y',
    reason:
      'セルの中の文字・バッジ・空の状態が、行によって上下に 1.5〜1.7px 寄る（基準 1.4px）。line-height（--k-line-body）と padding の組み合わせを見直す。',
  },

  // 箱・操作が、隣の文字の1行目の中心からずれる。
  {
    story: 'Components/Inputs/Switch',
    part: 'スイッチの欄',
    check: 'icon .k-switch',
    reason:
      'align-items: center で、ラベルと補助文を合わせたまとまりの中央に置いている。1行目に合わせる。',
  },
  {
    story: 'Components/Layout/Card',
    part: 'カードの見出し',
    check: 'icon :scope > .k-button',
    reason: '右の操作（32px）が、見出しの1行目（小見出し）の中心より 6px 下にある。',
  },
  {
    story: 'Components/Navigation/Pagination',
    part: 'ページ送り',
    check: 'icon .k-button',
    when: { typography: 'interface' },
    reason: '本文14px のとき、ページ番号（等幅）の行の中心とボタンの中心が 0.8px ずれる。',
  },

  // 高さが 4px の格子に乗らない。
  {
    story: 'Components/Feedback/Skeleton',
    part: '仮表示',
    check: 'grid-height',
    reason: 'Story の Default が height 18 を渡している。部品の既定値（16px）は格子に乗っている。',
  },
];

/** 公開しているが、配置を測る部品ではないもの。 */
export const NOT_A_PART: Record<string, string> = {
  KeiProvider: '配色・密度・文字の範囲を決める入れ物。すべての Story の外側で使っている。',
  PortalSurface: 'ポータルにテーマを引き継ぐ入れ物。Dialog・Select・Tooltip の中で測っている。',
  DialogClose: 'Radix の Close をそのまま出したもの。見た目は中に置くボタンが決める。',
};
