// Each layout check must still catch the mistake it was written for, and pass the right way.
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { KeiProvider, Sparkline } from '../../index';
import '../../styles/fonts.css';
import '../../styles/kei.css';
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

  it('読み上げ用に隠した文字は測らない', () => {
    // Without a visible label there is no line to centre the icon on, so nothing is reported.
    const spinner = (hidden: string) =>
      `<span class="k-x" style="display: inline-flex; align-items: flex-start; line-height: 24px">
        <span class="k-box" style="width: 16px; height: 16px"></span>
        <span class="k-sr-only"${hidden}>読み込み中</span>
      </span>`;
    expect(messages(spinner(''), { icon: '.k-box' })).toEqual([]);
    expect(
      messages(
        spinner(' style="position: static; clip: auto; width: auto; height: auto; margin: 0"'),
        {
          icon: '.k-box',
        },
      )[0],
    ).toMatch(/文字「読み込み中」の1行目の行ボックスの中心より 4px 上にあります/);
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

  it('正方形', () => {
    expect(messages(box('width: 40px; height: 32px; padding: 0'), 'square')[0]).toMatch(
      /幅 40px・高さ 32px で、正方形になっていません/,
    );
    expect(messages(box('width: 32px; height: 32px; padding: 0'), 'square')).toEqual([]);
  });

  it('フォーカスの輪郭の余地', () => {
    // The ring reaches 4px outside the box; a clipping parent with less padding cuts it.
    const inside = (pad: number) =>
      `<div style="overflow: hidden; padding: ${pad}px"><button class="k-x" style="display: block; width: 32px; height: 32px">×</button></div>`;
    expect(messages(inside(2), 'focus-room')[0]).toMatch(
      /はみ出しを切る親 div「×」 に左で 2px・上で 2px・下で 2px 切られます/,
    );
    expect(messages(inside(4), 'focus-room')).toEqual([]);
    expect(
      messages(
        `<div style="padding: 0"><button class="k-x" style="width: 32px; height: 32px">×</button></div>`,
        'focus-room',
      ),
    ).toEqual([]);
  });

  it('文字の端', () => {
    const menu = (lead: string) =>
      `<div class="k-x">
        <div style="display: flex; gap: 8px"><span style="width: 16px">✓</span><span class="k-t">表示する</span></div>
        <div style="display: flex; gap: 8px">${lead}<span class="k-t">隠す</span></div>
      </div>`;
    expect(messages(menu(''), { textEdge: 'start', of: '.k-t' })[0]).toMatch(
      /文字の左端がそろっていません：span\.k-t「表示する」 を基準に、span\.k-t「隠す」 -24px/,
    );
    expect(
      messages(menu('<span style="width: 16px"></span>'), { textEdge: 'start', of: '.k-t' }),
    ).toEqual([]);
  });

  it('宣言のない操作の要素を見つける', () => {
    host.innerHTML =
      '<div class="k-x"><button>保存</button></div><button class="k-new">追加</button>';
    const parts = [{ name: '見本', selector: '.k-x', checks: ['fits' as const] }];
    expect(undeclared(parts, host)).toEqual(['button.k-new「追加」']);
    expect(undeclared([...parts, { ...parts[0], selector: '.k-new' }], host)).toEqual([]);
  });
});

describe('配置の検査：中身の広がりと文字のベースライン', () => {
  it('中身の広がり', () => {
    const chart = (ratio: string) =>
      `<svg class="k-x" viewBox="0 0 200 50" ${ratio} style="display: block; width: 296px; height: 40px">
        <polyline points="0,40 100,10 200,30" fill="none" stroke="black" vector-effect="non-scaling-stroke" />
      </svg>`;
    expect(messages(chart(''), 'fills-x')[0]).toMatch(
      /箱の幅 296px、左に 68px・右に 68px の空き.*preserveAspectRatio/,
    );
    expect(messages(chart('preserveAspectRatio="none"'), 'fills-x')).toEqual([]);
  });

  it('文字のベースライン', () => {
    // A value set larger and with its own line height sits lower unless the row aligns baselines.
    const row = (align: string) =>
      `<div class="k-x" style="display: flex; justify-content: space-between; align-items: ${align}; font: 13px / 20px sans-serif">
        <span>CPU</span>
        <span style="font: 14.4px / 28px monospace">42%</span>
      </div>`;
    expect(messages(row('flex-start'), { baseline: ':scope > *' })[0]).toMatch(
      /span「CPU」（13px）を基準に、span「42%」（14.4px）\+\d(\.\d)?px。基準：差が 0.5px 以内。flex なら align-items: baseline/,
    );
    expect(messages(row('baseline'), { baseline: ':scope > *' })).toEqual([]);
  });

  it('行の箱の格子', async () => {
    // A number in another face inherits the line height in px and pushes the line box past it.
    await document.fonts.load('36px "KEI Mono"', '42');
    await document.fonts.load('14px "IBM Plex Sans JP"', '%');
    const value = (unit: string) =>
      `<div class="k-x" style="font: 36px / 44px 'KEI Mono'">42<span style="font-size: 14px; font-family: 'IBM Plex Sans JP'; ${unit}">%</span></div>`;
    expect(messages(value(''), 'line-grid')[0]).toMatch(
      /行の箱の高さが [\d.]+px で、4px の倍数から [\d.]+px ずれています。.*line-height は 44px ですが、同じ行に KEI Mono 36px・IBM Plex Sans JP 14px の文字が混ざり/,
    );
    expect(messages(value('line-height: 1'), 'line-grid')).toEqual([]);
    expect(
      messages('<div class="k-x" style="font: 28px / 1.2 monospace">68</div>', 'line-grid')[0],
    ).toMatch(/行の箱の高さが 33.6px.*line-height が 33.6px です。/);
  });
});

describe('実際の部品で検出する', () => {
  it('Sparkline の折れ線が箱の左右いっぱいに広がる', () => {
    const root = createRoot(host);
    flushSync(() =>
      root.render(
        <KeiProvider>
          <div style={{ width: 296 }}>
            <Sparkline values={[3, 7, 4, 8, 6, 12]} label="処理数の推移" />
          </div>
        </KeiProvider>,
      ),
    );
    const { violations } = checkPart(
      { name: '折れ線', selector: '.k-sparkline', checks: ['fills-x'] },
      host,
    );
    root.unmount();
    // The fixture above shows the miss; the real part stretches its viewBox to the box.
    expect(violations.map((v) => v.message)).toEqual([]);
  });
});
