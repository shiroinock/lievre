// What a story declares for the layout gate, and the criteria each check holds it to.
// The criteria are written out for people in docs/quality-gate.md; keep the two in step.

/** Story の meta の `parameters.layoutGate` に書く宣言。 */
export type LayoutGate =
  | {
      /** 測る部品。selector は `.k-` で始め、Story の描画（ポータルを含む）から探す。 */
      parts: LayoutPart[];
      /**
       * 部品を組み合わせた画面（デモ・画面例）のとき、その理由。操作の要素がすべて宣言に
       * 入っているか、宣言した部品がすべて描画されているかは見ない。
       */
      screen?: string;
    }
  | {
      /** 部品を測らない理由。部品をそれぞれの Story で測っている見本など。 */
      skip: string;
    };

export type LayoutPart = {
  /** 失敗のメッセージに出す日本語の名前。「ボタン」「入力欄」など。 */
  name: string;
  selector: string;
  checks: LayoutCheck[];
};

export type LayoutCheck =
  /** 中の文字・アイコンが左右の中央にある（文字の輪郭で測る）。 */
  | 'inset-x'
  /** 中の文字・アイコンが上下の中央にある（文字の輪郭で測る）。 */
  | 'inset-y'
  /** 高さが操作の高さ（24 / 32 / 40 / 48px、タッチは44px）のどれか。 */
  | 'control-height'
  /** 高さが 4px の倍数。 */
  | 'grid-height'
  /** 幅と高さが同じ（アイコンだけのボタン）。 */
  | 'square'
  /** フォーカスの輪郭（2px の線と 2px の隙間）が、はみ出しを切る親の内側に収まる。 */
  | 'focus-room'
  /** padding と罫線を除いた行の箱の高さが 4px の倍数（書体や大きさの違う文字が混ざる行で崩れる）。 */
  | 'line-grid'
  /** padding が上下左右で同じ（パネル）。 */
  | 'padding-equal'
  /** 操作の帯（Dialog の下など）：上下の padding が bandY、左右は直前の区画（パネルの本文）と同じ。 */
  | 'action-band'
  /** 中身が横にはみ出していない。はみ出しを切る要素（overflow が visible でない）では縦も見る。 */
  | 'fits'
  /** 左右の padding が高さの決まった割合（button 0.4、input 0.3 を 4px に丸めた値）。 */
  | { padding: 'button' | 'input' }
  /**
   * アイコン・箱の縦の中心が、隣の文字の1行目の行ボックスの中央にある。
   * block を付けると、1行目ではなく text の箱（見出しのまとまり）の中央と比べる。
   */
  | { icon: string; text?: string; block?: true }
  /** 部品の中で selector に当たる要素の高さが揃っている。 */
  | { sameHeight: string }
  /** 描いた中身（svg の線や図形）が、箱の左右いっぱいに広がっている。 */
  | 'fills-x'
  /** 部品の中で selector に当たり、同じ行に並ぶ文字のベースラインがそろっている。 */
  | { baseline: string }
  /** 部品の中で selector に当たる要素の文字の左端（start）か右端（end）がそろっている。 */
  | { textEdge: 'start' | 'end'; of: string };

export const CRITERIA = {
  /** 中央揃えの部品の左右のずれ（左右の余白の差の半分）。 */
  insetX: 0.5,
  /** 上下のずれ（上下の余白の差の半分）。IBM Plex Sans JP の漢字は行の中央より 0.06em 上に寄るため em で許す。 */
  insetYEm: 0.1,
  /** アイコンの中心と1行目の行ボックスの中心の差。 */
  icon: 0.5,
  /** 高さ・余白の比べ合わせの許容差。 */
  size: 0.5,
  controlHeights: [24, 32, 40, 48],
  coarseControlHeight: 44,
  grid: 4,
  paddingRatio: { button: 0.4, input: 0.3 },
  /** 操作の帯の上下の padding。 */
  bandY: 16,
  /** 描いた中身と箱の左右の空き。線の太さの分だけ許す。 */
  fill: 2,
  /** 行の箱の高さと 4px の倍数の差。行の高さはレイアウトの値そのものなので小さく取る。 */
  line: 0.1,
  /** 同じ行の文字のベースラインの差。 */
  baseline: 0.5,
  /** フォーカスの輪郭が要素の外に出る幅（outline 2px + outline-offset 2px）。 */
  focusRing: 4,
} as const;

/**
 * 行高や文字間隔を利用者の設定のように上書きする点検用の Story（Story の `parameters.layoutStress`
 * に理由を書く）では見ない検査。上書きした行高で格子や操作の高さから外れるのは意図どおりなので、
 * はみ出しや並びの崩れだけを見る。
 */
export const STRESS_SKIPS: ReadonlySet<string> = new Set([
  'line-grid',
  'grid-height',
  'control-height',
  'inset-y',
]);

export const checkId = (check: LayoutCheck) =>
  typeof check === 'string'
    ? check
    : 'padding' in check
      ? 'padding'
      : 'icon' in check
        ? `icon ${check.icon}`
        : 'baseline' in check
          ? 'baseline'
          : 'textEdge' in check
            ? 'text-edge'
            : 'same-height';

export const CHECK_LABEL: Record<string, string> = {
  'inset-x': '左右の中央',
  'inset-y': '上下の中央',
  'control-height': '操作の高さ',
  'grid-height': '高さの格子',
  square: '正方形',
  'focus-room': 'フォーカスの輪郭の余地',
  'line-grid': '行の箱の格子',
  'padding-equal': 'パネルの内側の余白',
  'action-band': '操作の帯の余白',
  fits: 'はみ出し',
  padding: '左右の内側の余白',
  icon: 'アイコンと文字の縦の中心',
  'same-height': '並んだ部品の高さ',
  'fills-x': '中身の広がり',
  baseline: '文字のベースライン',
  'text-edge': '文字の端',
};
