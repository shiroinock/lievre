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
  // ボタン：左右の padding が 14px（compact 10px）。基準は高さ×0.4（40→16、32→12、48→20px）。
  ...[
    'Components/Actions/Button',
    'Components/Actions/ActionLink',
    'Components/Overlays/Dialog',
    'Components/Overlays/Toast',
    'Components/Feedback/Tooltip',
  ].map((story) => ({
    story,
    part: {
      'Components/Actions/Button': 'ボタン',
      'Components/Actions/ActionLink': 'リンクのボタン',
      'Components/Overlays/Dialog': '開くボタン',
      'Components/Overlays/Toast': '通知を出すボタン',
      'Components/Feedback/Tooltip': 'ヒントを出すボタン',
    }[story]!,
    check: 'padding',
    reason:
      '--k-control-padding が 0 14px（compact 0 10px）、sm が 0 10px。高さ×0.4 の 16 / 12 / 20px にそろえていない。',
  })),
  {
    story: 'Components/Inputs/TextField',
    part: '入力欄',
    check: 'padding',
    when: { density: 'compact' },
    reason: 'compact の --k-input-padding が 5px 10px。高さ 32px の入力欄は 32×0.3 を丸めた 8px。',
  },
  {
    story: 'Components/Inputs/Select',
    part: '選択の欄',
    check: 'padding',
    when: { density: 'compact' },
    reason: '入力欄と同じ --k-input-padding（compact 5px 10px）を使っている。',
  },

  // 選択の欄：高さが 40.6px（compact 32.6px）になり、隣の入力欄・ボタンと揃わない。
  {
    story: 'Components/Inputs/Select',
    part: '選択の欄',
    check: 'control-height',
    reason:
      '矢印を包む span（Radix の Select.Icon）の中で svg が文字の基線に乗り、行が 20.6px になる。そのため min-height を 0.6px 超える。',
  },
  {
    story: 'Components/Layout/Stack',
    part: 'スタック',
    check: 'same-height',
    reason: '選択の欄だけ 40.6px で、入力欄・ボタン（40px）より 0.6px 高い（上の例外と同じ原因）。',
  },
  {
    story: 'Components/Inputs/Select',
    part: '選択の欄',
    check: 'inset-y',
    reason: '矢印の span が行より 1px 高く、padding 9px で上から積むため、文字が上に 2.5px 寄る。',
  },
  {
    story: 'Components/Inputs/Select',
    part: '選択の欄',
    check: 'icon svg',
    reason: '矢印の svg が文字の1行目の中心より上にある（上の例外と同じ原因）。',
  },
  {
    story: 'Components/Inputs/Select',
    part: '選択肢',
    check: 'inset-y',
    reason:
      'line-height 1.5（21px）の行を高さ 40px の中央に置くと、文字の輪郭が上に 1.9px 寄る（基準 1.4px）。',
  },
  {
    story: 'Components/Inputs/Select',
    part: '選択肢',
    check: 'control-height',
    when: { density: 'compact' },
    reason: 'compact で min-height 32px を padding と行の高さが超え、33px になる。',
  },

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
    reason: 'padding が 14px 16px。パネルの padding は上下左右で同じ値にする。',
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

  // 高さが 4px の格子に乗らない。
  {
    story: 'Components/Feedback/Badge',
    part: 'バッジ',
    check: 'grid-height',
    reason:
      'padding 1px と line-height 1.6（12px×1.6=19.2px）で 21.2px になる。20px か 24px にする。',
  },
  {
    story: 'Components/Display/Kbd',
    part: 'キー',
    check: 'grid-height',
    reason: 'line-height 1.4 と罫線で 22.2px になる。20px か 24px にする。',
  },
  {
    story: 'Components/Feedback/Skeleton',
    part: '仮表示',
    check: 'grid-height',
    reason: 'Story の Default が height 18 を渡している。部品の既定値（16px）は格子に乗っている。',
  },

  // 上下の中央からずれる。
  {
    story: 'Components/Display/Kbd',
    part: 'キー',
    check: 'inset-y',
    reason: '記号（⌘ など）の字形が等幅の書体で下に寄り、上下の差の半分が 1.5px（基準 1.4px）。',
  },
  {
    story: 'Components/Navigation/Tabs',
    part: 'タブ',
    check: 'inset-y',
    reason:
      'タブの line-height を決めておらず本文の 1.75（24.5px）を継ぐ。文字の輪郭が上に 1.5px 寄る（基準 1.4px）。高さも 40.5px になる。',
  },
  {
    story: 'Components/Data/DataTable',
    part: '表のセル',
    check: 'inset-y',
    reason:
      'セルの line-height を決めておらず本文の 1.75 を継ぐ。文字の輪郭が上に寄り、長い日本語の行や空の状態で基準を超える。',
  },
  {
    story: 'Components/Inputs/Checkbox',
    part: 'チェックの箱',
    check: 'inset-y',
    reason:
      'Radix の Indicator（span）が本文の行の高さ（16px×1.75=28px）を継いで箱より高くなり、記号が上に 2px 寄る。',
  },

  // アイコン・箱が、隣の文字の1行目の中心からずれる。
  {
    story: 'Components/Inputs/Checkbox',
    part: 'チェックボックスの欄',
    check: 'icon .k-checkbox',
    when: { typography: 'standard' },
    reason:
      '箱を margin-top: 2px で置いているため、本文16px の行（16×1.75）では中心が 2.5px 上になる。margin-top: calc((1lh - 20px) / 2) にする。',
  },
  {
    story: 'Components/Inputs/RadioGroup',
    part: 'ラジオボタン',
    check: 'icon input',
    reason: '丸を margin-top: 0.2em で置いているため、行の中心と 0.8px ずれる。',
  },
  {
    story: 'Components/Inputs/Switch',
    part: 'スイッチの欄',
    check: 'icon .k-switch',
    reason:
      'align-items: center で、ラベルと補助文を合わせたまとまりの中央に置いている。1行目に合わせる。',
  },
  {
    story: 'Components/Feedback/Badge',
    part: 'バッジ',
    check: 'icon .k-status-dot',
    reason:
      '状態の点が align-items: center で文字の箱の中央に置かれ、行ボックスの中心より 0.6px 下になる。',
  },
  {
    story: 'Components/Layout/Card',
    part: 'カードの見出し',
    check: 'icon :scope > .k-button',
    reason:
      '見出しを align-items: flex-start で並べ、右の操作を見出しの1行目の中心に合わせていない。',
  },
];

/** 公開しているが、配置を測る部品ではないもの。 */
export const NOT_A_PART: Record<string, string> = {
  KeiProvider: '配色・密度・文字の範囲を決める入れ物。すべての Story の外側で使っている。',
  PortalSurface: 'ポータルにテーマを引き継ぐ入れ物。Dialog・Select・Tooltip の中で測っている。',
  DialogClose: 'Radix の Close をそのまま出したもの。見た目は中に置くボタンが決める。',
};
