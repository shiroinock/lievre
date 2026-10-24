// Each layout check must still catch the mistake it was written for, and pass the right way.
import { describe, it, expect, afterEach } from 'vitest';
import { checkPart, undeclared } from './checks';
import type { LayoutCheck } from './declare';

const host = document.createElement('div');
host.className = 'kei';
host.style.cssText = 'font: 14px / 1.4 sans-serif; width: 600px';
document.body.append(host);
afterEach(() => host.replaceChildren());

function messages(html: string, check: LayoutCheck) {
  host.innerHTML = html;
  const { found, violations } = checkPart(
    { name: '見本', selector: '.k-x', checks: [check] },
    host,
  );
  expect(found).toBeGreaterThan(0);
  return violations.map((v) => v.message);
}
const box = (style: string, inner = '保存する') =>
  `<button class="k-x" style="display: flex; align-items: center; justify-content: center; border: 1px solid; font: inherit; ${style}">${inner}</button>`;

describe('配置の検査', () => {
  it('左右の中央', () => {
    const [message] = messages(box('height: 40px; padding: 0 20px 0 10px'), 'inset-x');
    expect(message).toMatch(/5px 左に寄っています（左の余白 10px・右の余白 20px）/);
    expect(messages(box('height: 40px; padding: 0 16px'), 'inset-x')).toEqual([]);
  });

  it('上下の中央', () => {
    const [message] = messages(box('height: 40px; padding: 8px 0 0'), 'inset-y');
    expect(message).toMatch(/下に寄っています.*基準：上下の余白の差の半分が 0.1em（1.4px）以内/);
    expect(messages(box('height: 40px; padding: 0'), 'inset-y')).toEqual([]);
  });

  it('操作の高さ', () => {
    expect(messages(box('height: 41px'), 'control-height')[0]).toMatch(/高さが 41px です/);
    for (const h of [24, 32, 40, 44, 48])
      expect(messages(box(`height: ${h}px`), 'control-height')).toEqual([]);
  });

  it('高さの格子', () => {
    expect(messages(box('height: 21.2px'), 'grid-height')[0]).toMatch(/近いのは 20px か 24px/);
    expect(messages(box('height: 20px'), 'grid-height')).toEqual([]);
  });

  it('パネルの内側の余白', () => {
    const panel = (p: string) => `<div class="k-x" style="padding: ${p}">本文</div>`;
    expect(messages(panel('12px 16px'), 'padding-equal')[0]).toMatch(
      /上 12px・右 16px・下 12px・左 16px/,
    );
    expect(messages(panel('16px'), 'padding-equal')).toEqual([]);
  });

  it('左右の内側の余白（高さとの比）', () => {
    expect(messages(box('height: 40px; padding: 0 14px'), { padding: 'button' })[0]).toMatch(
      /左 14px・右 14px です。基準：高さ 40px のボタンは 16px/,
    );
    expect(messages(box('height: 32px; padding: 0 12px'), { padding: 'button' })).toEqual([]);
    expect(messages(box('height: 48px; padding: 0 16px'), { padding: 'input' })).toEqual([]);
  });

  it('はみ出し', () => {
    const narrow = (wrap: string) =>
      `<div class="k-x" style="width: 40px; white-space: ${wrap}">とても長いラベルの文字</div>`;
    expect(messages(narrow('nowrap'), 'fits')[0]).toMatch(/横に \d+px/);
    expect(messages(narrow('normal'), 'fits')).toEqual([]);
    // Text cut by a clipping box counts; glyphs rising out of a visible one do not.
    const short = (overflow: string) =>
      `<div class="k-x" style="height: 10px; line-height: 20px; overflow: ${overflow}">文字</div>`;
    expect(messages(short('hidden'), 'fits')[0]).toMatch(/縦に 10px/);
    expect(messages(short('visible'), 'fits')).toEqual([]);
  });

  it('アイコンと文字の縦の中心', () => {
    const row = (margin: number) =>
      `<label class="k-x" style="display: flex; align-items: flex-start; gap: 8px; line-height: 28px">
        <span class="k-box" style="width: 20px; height: 20px; margin-top: ${margin}px; border: 1px solid; box-sizing: border-box"></span>
        <span>更新時に通知する</span>
      </label>`;
    expect(messages(row(0), { icon: '.k-box' })[0]).toMatch(
      /span\.k-box の縦の中心が、文字「更新時に通知する」の1行目の行ボックスの中心より 4px 上にあります/,
    );
    expect(messages(row(4), { icon: '.k-box' })).toEqual([]);
  });

  it('並んだ部品の高さ', () => {
    const row = (h: number) =>
      `<div class="k-x" style="display: flex; align-items: flex-end">
        <input class="k-a" style="height: 40px; box-sizing: border-box">
        <button class="k-b" style="height: ${h}px">検索する</button>
      </div>`;
    expect(messages(row(41), { sameHeight: '.k-a, .k-b' })[0]).toMatch(
      /input\.k-a 40px、button\.k-b「検索する」 41px/,
    );
    expect(messages(row(40), { sameHeight: '.k-a, .k-b' })).toEqual([]);
  });

  it('宣言のない操作の要素を見つける', () => {
    host.innerHTML =
      '<div class="k-x"><button>保存</button></div><button class="k-new">追加</button>';
    const parts = [{ name: '見本', selector: '.k-x', checks: ['fits' as const] }];
    expect(undeclared(parts, host)).toEqual(['button.k-new「追加」']);
    expect(undeclared([...parts, { ...parts[0], selector: '.k-new' }], host)).toEqual([]);
  });
});
