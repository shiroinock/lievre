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
  // 描いた中身が箱いっぱいに広がらない。
  ...[
    'Components/Data/Sparkline',
    'Components/Data/Metric',
    'Patterns/Application',
    'Patterns/Workspace',
  ].map((story) => ({
    story,
    part: '折れ線',
    check: 'fills-x',
    reason:
      'Sparkline の svg に preserveAspectRatio がなく、既定の xMidYMid meet で viewBox（200×50）の縦横比が保たれ、折れ線が箱の中央に縮む。',
  })),

  // 部品を組み合わせた画面でだけ起きるもの。
  ...['Patterns/Application', 'Patterns/Workspace'].map((story) => ({
    story,
    part: 'メーター',
    check: 'fits',
    reason: 'Meter は幅 200px で、それより狭い枠（計器パネル）に入れると 6px はみ出す。',
  })),
  {
    story: 'Patterns/Workspace',
    part: '進み具合の見出し',
    check: 'baseline',
    reason:
      '幅 320px・行高 1.5・文字間隔を広げた点検用の Story で、値の側のベースラインが 2px 下になる。.k-progress-label が align-items: baseline でない。',
  },
  {
    story: 'Patterns/Workspace',
    part: 'ボタン',
    check: 'control-height',
    reason: '行高 1.5・文字間隔を広げた点検用の Story で、sm のボタンが 41px になる。',
  },
  {
    story: 'Patterns/Workspace',
    part: 'ボタン',
    check: 'inset-y',
    reason:
      '行高 1.5 を当てた点検用の Story で、sm のボタンの文字が上に 1.7px 寄る（基準 1.3px）。',
  },
  {
    story: 'Patterns/Workspace',
    part: 'バッジ',
    check: 'grid-height',
    reason: '行高 1.5 を当てた点検用の Story で、バッジが 18px になる。',
  },
  ...['Patterns/Application', 'Patterns/Everyday'].map((story) => ({
    story,
    part: 'ボタン',
    check: 'inset-y',
    reason:
      '資料の絞り込みの「整える」ボタンで、文字の輪郭が上に 1.5px 寄る（基準 1.4px）。ほかのラベルは基準内なので、字形によるずれか確かめる。',
  })),
  // 行の箱：文字の行の高さが 4px の格子から外れる。
  ...['Components/Data/Metric', 'Patterns/Application', 'Patterns/Workspace'].map((story) => ({
    story,
    part: '指標の値',
    check: 'line-grid',
    reason:
      '値の行が 51px（Workspace の点検用 Story は 54px）。KEI Mono 36px の line-height 44px を単位の IBM Plex Sans JP 14px も受け継ぎ、ベースラインのずれで行の箱が広がる。単位の span に line-height: 1 を当てれば 44px に戻る。',
  })),
  ...['Components/Data/Meter', 'Patterns/Application', 'Patterns/Workspace'].map((story) => ({
    story,
    part: 'メーターの読み値',
    check: 'line-grid',
    reason:
      '読み値の行が 33.6px（Workspace の点検用 Story は 42px）。.k-meter-reading strong の line-height が 1.2（28px × 1.2）で、4px に丸めていない。round(1.2em, 4px) にすれば 32px になる。',
  })),
  {
    story: 'Components/Data/DataTable',
    part: '表のセル',
    check: 'line-grid',
    reason:
      '等幅の数字（KEI Mono 14.4px）を入れたセルの行が、IBM Plex Sans JP 14px の line-height 24px より 0.5px 高い 24.5px になる。border-collapse の罫線の半分を数えるため、同じ表のほかの行は 23.5px と測れる。等幅の側の line-height を小さくすれば揃う。',
  },
  {
    story: 'Patterns/Workspace',
    part: '進み具合の見出し',
    check: 'line-grid',
    reason:
      '行高 1.5 を当てた点検用の Story で、ラベルの行が 21.6px になる（KEI Mono 14.4px × 1.5）。Progress の Story と画面例の標準の行高では 20px に収まっている。',
  },
];

/** 公開しているが、配置を測る部品ではないもの。 */
export const NOT_A_PART: Record<string, string> = {
  KeiProvider: '配色・密度・文字の範囲を決める入れ物。すべての Story の外側で使っている。',
  PortalSurface: 'ポータルにテーマを引き継ぐ入れ物。Dialog・Select・Tooltip の中で測っている。',
  DialogClose: 'Radix の Close をそのまま出したもの。見た目は中に置くボタンが決める。',
};
