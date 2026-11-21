// Width and kana normalisation for Japanese input. `normalize('NFKC')` alone also turns
// half-width katakana into full-width and rewrites many symbols (①, ㈱, ℃), so each field picks
// what it straightens instead.

export type HalfWidthOptions = {
  /** 全角の数字（０〜９）を半角に。既定は true。 */
  digits?: boolean;
  /** 全角の英字（Ａ〜Ｚ・ａ〜ｚ）を半角に。既定は true。 */
  latin?: boolean;
  /** 全角の記号（！〜～のうち数字と英字のほか。＠・＃・（）など）を半角に。既定は true。 */
  symbols?: boolean;
  /** 全角の空白（U+3000）を半角の空白に。既定は true。 */
  space?: boolean;
  /** 横棒の仲間（‐ ‑ ‒ – — ― − ー ｰ －）をハイフンに。電話番号・郵便番号のように、数字の間の横棒だけを扱う欄で使います。言葉の長音（ー）も変わるので、既定は false。 */
  dashes?: boolean;
};

const DASHES = /[‐-―−ーｰ－]/g;

/**
 * 全角の数字・英字・記号・空白を半角に直します。半角のカタカナ（ｶﾅ）や、①・㈱などは変えません。
 * 電話番号・郵便番号・金額・メールの欄で、確定した文字に使います（変換中の文字には使いません）。
 */
export function toHalfWidth(text: string, options: HalfWidthOptions = {}) {
  const { digits = true, latin = true, symbols = true, space = true, dashes = false } = options;
  let out = text.replace(/[！-～]/g, (c) => {
    const half = String.fromCharCode(c.charCodeAt(0) - 0xfee0);
    const kind = /[0-9]/.test(half) ? digits : /[A-Za-z]/.test(half) ? latin : symbols;
    return kind ? half : c;
  });
  if (space) out = out.replace(/　/g, ' ');
  if (dashes) out = out.replace(DASHES, '-');
  return out;
}

/** 半角のカタカナ（ｶﾞﾝﾀﾞﾑ）を全角（ガンダム）に直します。濁点・半濁点は前の字と合わせます。ほかの字は変えません。 */
export function toFullWidthKana(text: string) {
  return text.replace(/[｡-ﾟ]+/g, (run) => run.normalize('NFKC'));
}

const toHiragana = (s: string) =>
  s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

/**
 * 探すときに比べる形に直します。全角と半角（NFKC）、カタカナとひらがな、大文字と小文字、空白の違いを無視します。
 * 候補と入力の両方をこの形にしてから比べます（Combobox の絞り込みと同じ）。表示には使いません。
 */
export function toSearchKey(text: string) {
  return toHiragana(text.normalize('NFKC')).toLowerCase().replace(/\s+/g, '');
}
