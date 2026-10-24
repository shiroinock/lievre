// What a story declares for the layout gate, and the criteria each check holds it to.
// The criteria are written out for people in docs/quality-gate.md; keep the two in step.

/** Story の meta の `parameters.layoutGate` に書く宣言。 */
export type LayoutGate =
  | {
      /** 測る部品。selector は `.k-` で始め、Story の描画（ポータルを含む）から探す。 */
      parts: LayoutPart[];
    }
  | {
      /** 部品を測らない理由。画面例など、部品をそれぞれの Story で測っているもの。 */
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
  /** padding が上下左右で同じ（パネル）。 */
  | 'padding-equal'
  /** 中身が横にはみ出していない。はみ出しを切る要素（overflow が visible でない）では縦も見る。 */
  | 'fits'
  /** 左右の padding が高さの決まった割合（button 0.4、input 0.3 を 4px に丸めた値）。 */
  | { padding: 'button' | 'input' }
  /** アイコン・箱の縦の中心が、隣の文字の1行目の行ボックスの中央にある。 */
  | { icon: string; text?: string }
  /** 部品の中で selector に当たる要素の高さが揃っている。 */
  | { sameHeight: string };

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
} as const;

export const checkId = (check: LayoutCheck) =>
  typeof check === 'string'
    ? check
    : 'padding' in check
      ? 'padding'
      : 'icon' in check
        ? `icon ${check.icon}`
        : 'same-height';

export const CHECK_LABEL: Record<string, string> = {
  'inset-x': '左右の中央',
  'inset-y': '上下の中央',
  'control-height': '操作の高さ',
  'grid-height': '高さの格子',
  'padding-equal': 'パネルの内側の余白',
  fits: 'はみ出し',
  padding: '左右の内側の余白',
  icon: 'アイコンと文字の縦の中心',
  'same-height': '並んだ部品の高さ',
};
