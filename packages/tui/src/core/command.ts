// The command palette's state and keys, without Ink. Filtering is the same as @lievre/react's
// CommandPalette (packages/react/src/components/command-palette.tsx);
// packages/react/src/test/command-parity.test.tsx checks that the two give the same answers, so a
// change to one must be made to the other.

/** パレットに並べる項目。Web の CommandItem と同じ形（onSelect の代わりに、選んだ値を返します）。 */
export type TermCommand = {
  /** 項目を見分ける値。選んだときに返します。 */
  value: string;
  /** 一覧に出す名前。何が起きるかを動詞で書きます。 */
  label: string;
  /** 読み（ひらがな）。漢字の名前を読みでも探せるようにします。 */
  kana?: string;
  /** 名前に出ない探し言葉（英語の名前・略称）。 */
  keywords?: string[];
  /** まとまりの名前。同じ group は、最初に出てきた順に見出しの下へまとめます。 */
  group?: string;
  /** 名前の後ろに出す補足。 */
  description?: string;
  /** 右に出すキーの近道（見せるだけ）。 */
  shortcut?: string;
  /** 選べないようにします。一覧には残し、矢印キーでは飛ばします。 */
  disabled?: boolean;
};

/**
 * 開くキー。Web の CommandHotkey と同じ形です。
 * mod は Ctrl（どの端末でも届く）か ⌘（kitty のキーボードの決まりで ⌘ を渡す端末だけ）。alt は Option / Alt です。
 */
export type TermHotkey = { key: string; mod?: boolean; shift?: boolean; alt?: boolean };

/**
 * 既定の開くキー。Web と同じ「mod + K」で、端末ではどの OS でも Ctrl+K です。
 * macOS の端末の多くは ⌘K を自分で使う（画面を消す）ので、アプリに届きません。⌘K は、届く端末でだけ同じに働きます。
 */
export const DEFAULT_TERM_HOTKEY: TermHotkey = { key: 'k', mod: true };

/** Ink の useInput が渡すキーのうち、パレットが見るもの。 */
export type TermKey = {
  upArrow?: boolean;
  downArrow?: boolean;
  home?: boolean;
  end?: boolean;
  return?: boolean;
  escape?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  meta?: boolean;
  super?: boolean;
  tab?: boolean;
  backspace?: boolean;
  delete?: boolean;
};

/** パレットの状態。query は確定した文字（端末は変換を終えた文字だけを送ります）。 */
export type PaletteState = { open: boolean; query: string; highlighted: number };

export const closedPalette: PaletteState = { open: false, query: '', highlighted: -1 };

const toHiragana = (s: string) =>
  s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

/** 比べる形。全角と半角（NFKC）、カタカナとひらがな、大文字と小文字、空白の違いを無視します（Web の toSearchKey と同じ）。 */
export function toSearchKey(text: string) {
  return toHiragana(text.normalize('NFKC')).toLowerCase().replace(/\s+/g, '');
}

/** 名前・読み・探し言葉・補足で絞り込みます。group ごとの順を保ちます（Web の filterCommands と同じ）。 */
export function filterCommands<T extends TermCommand>(items: readonly T[], query: string): T[] {
  const q = toSearchKey(query);
  const order: string[] = [];
  const byGroup = new Map<string, T[]>();
  for (const item of items) {
    const words = [item.label, item.kana, item.description, ...(item.keywords ?? [])];
    if (q && !words.some((w) => w !== undefined && toSearchKey(w).includes(q))) continue;
    const g = item.group ?? '';
    if (!byGroup.has(g)) {
      byGroup.set(g, []);
      order.push(g);
    }
    byGroup.get(g)!.push(item);
  }
  return order.flatMap((g) => byGroup.get(g)!);
}

const firstEnabled = (items: readonly TermCommand[]) => items.findIndex((i) => !i.disabled);

/** 選べる項目のうち、from から step（1 か -1）の向きで次のもの。端まで来たら反対の端へ回ります。 */
function step(items: readonly TermCommand[], from: number, dir: 1 | -1) {
  const n = items.length;
  for (let i = 1; i <= n; i++) {
    const at = (((from + dir * i) % n) + n) % n;
    if (!items[at].disabled) return at;
  }
  return -1;
}

/** 押されたキーが開くキーか。Ctrl と ⌘ はどちらでも mod として数えます。 */
export function isHotkey(input: string, key: TermKey, hotkey: TermHotkey = DEFAULT_TERM_HOTKEY) {
  const mod = !!key.ctrl || !!key.super;
  if (!!hotkey.mod !== mod) return false;
  if (!!hotkey.alt !== !!key.meta) return false;
  // Without the kitty protocol a terminal can't send Shift with Ctrl, so Shift is checked only
  // when the hotkey asks for it.
  if (hotkey.shift && !key.shift) return false;
  return input.toLowerCase() === hotkey.key.toLowerCase();
}

export type PaletteStep = { state: PaletteState; run?: string };

/**
 * 押されたキーで状態を進めます。関係のないキーなら undefined を返します。run は、Enter で選んだ項目の値です。
 * 閉じているときは開くキーだけを見ます。開いているときは、開くキーと Esc で閉じ、↑↓（Home・End）で移り、Enter で選んで閉じ、
 * 文字で絞り込み、Backspace で1字消します。最初に選べる項目を選びかけにしておきます。
 */
export function paletteKey(
  items: readonly TermCommand[],
  state: PaletteState,
  input: string,
  key: TermKey,
  hotkey: TermHotkey | false = DEFAULT_TERM_HOTKEY,
): PaletteStep | undefined {
  const pressedHotkey = hotkey !== false && isHotkey(input, key, hotkey);
  if (!state.open) {
    if (!pressedHotkey) return undefined;
    return {
      state: { open: true, query: '', highlighted: firstEnabled(filterCommands(items, '')) },
    };
  }
  if (pressedHotkey || key.escape) return { state: closedPalette };
  const shown = filterCommands(items, state.query);
  const at = (highlighted: number) => ({ state: { ...state, highlighted } });
  if (key.downArrow) return at(step(shown, state.highlighted, 1));
  if (key.upArrow) return at(step(shown, state.highlighted < 0 ? 0 : state.highlighted, -1));
  if (key.home) return at(firstEnabled(shown));
  if (key.end) return at(step(shown, 0, -1));
  if (key.return) {
    const item = shown[state.highlighted];
    if (!item || item.disabled) return undefined;
    return { state: closedPalette, run: item.value };
  }
  let query: string | undefined;
  if (key.backspace || key.delete) query = Array.from(state.query).slice(0, -1).join('');
  else if (input && !key.ctrl && !key.meta && !key.super && !key.tab)
    query = state.query + input.replace(/[\r\n]/g, '');
  if (query === undefined || query === state.query) return undefined;
  return { state: { open: true, query, highlighted: firstEnabled(filterCommands(items, query)) } };
}

/** 選べる項目の数の言葉。読み上げと画面で同じものを出します。 */
export function paletteCount(items: readonly TermCommand[], query: string, emptyText: string) {
  const n = filterCommands(items, query).filter((i) => !i.disabled).length;
  return n ? `${n}件のコマンドがあります` : emptyText;
}
