// @lievre/tui keeps its own copy of the palette's filtering (it does not depend on
// @lievre/react). The two must give the same answers, and open with the same key.
import { describe, expect, it } from 'vitest';
import * as web from '../components/command-palette';
import { toSearchKey } from '../components/normalize';
import * as term from '../../../tui/src/core/command';

const items: web.CommandItem[] = [
  { value: 'home', label: 'ホームへ移動', kana: 'ほーむへいどう', group: '移動' },
  { value: 'settings', label: '設定を開く', keywords: ['Settings', 'ｾｯﾃｲ'], group: '移動' },
  { value: 'new', label: '新しい作業を作る', kana: 'あたらしいさぎょうをつくる', group: '操作' },
  { value: 'export', label: 'ＣＳＶで書き出す', description: '表示中の一覧', group: '操作' },
  { value: 'theme', label: 'Ink のテーマにする', group: '表示' },
  { value: 'help', label: 'ヘルプ' },
  { value: 'archive', label: '作業をしまう', group: '操作', disabled: true },
];
const queries = [
  '',
  'せってい',
  'セッテイ',
  'settings',
  'ｃｓｖ',
  'csv',
  'さぎょう',
  'ink の',
  'へ',
  'ぞ',
];

describe('the palette in @lievre/react and @lievre/tui', () => {
  for (const q of queries)
    it(`filter the same for 「${q}」`, () => {
      const values = (list: { value: string }[]) => list.map((i) => i.value);
      expect(values(term.filterCommands(items, q))).toEqual(values(web.filterCommands(items, q)));
      expect(term.toSearchKey(q)).toBe(toSearchKey(q));
    });
  it('open with the same key', () => {
    expect(term.DEFAULT_TERM_HOTKEY).toEqual(web.DEFAULT_COMMAND_HOTKEY);
  });
});
