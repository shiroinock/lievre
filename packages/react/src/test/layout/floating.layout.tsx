// Floating panels (popover, menu) sit a 4px step away from what opened them and stay on screen
// when that is at the edge of the viewport.
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { userEvent } from 'vitest/browser';
import type { ReactNode } from 'react';
import { LievreProvider, Button, Popover, DropdownMenu } from '../../index';
import '../../styles/fonts.css';
import '../../styles/lievre.css';
import { CRITERIA } from './declare';

const PANELS: { name: string; selector: string; render: () => ReactNode }[] = [
  {
    name: 'ポップオーバー',
    selector: '.lv-popover',
    render: () => (
      <Popover trigger={<Button>開く</Button>} title="表示の設定">
        <p>表の行の高さと、数値の桁区切りを選びます。</p>
      </Popover>
    ),
  },
  {
    name: 'メニュー',
    selector: '.lv-menu',
    render: () => (
      <DropdownMenu
        trigger={<Button>操作</Button>}
        items={[
          { label: '編集', shortcut: '⌘E', onSelect: () => {} },
          { label: '担当をほかの人に変える', onSelect: () => {} },
        ]}
      />
    ),
  },
];

let root: Root | undefined;
afterEach(() => {
  root?.unmount();
  document.body.replaceChildren();
});

async function open(ui: ReactNode, justify: string, selector: string) {
  const host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <LievreProvider>
        <div style={{ display: 'flex', justifyContent: justify, padding: 8 }}>{ui}</div>
      </LievreProvider>,
    ),
  );
  const trigger = host.querySelector('button')!;
  await userEvent.click(trigger);
  await expect.poll(() => document.querySelector(selector)).toBeTruthy();
  await new Promise(requestAnimationFrame);
  return {
    trigger: trigger.getBoundingClientRect(),
    panel: document.querySelector(selector)!.getBoundingClientRect(),
  };
}

for (const { name, selector, render } of PANELS)
  describe(name, () => {
    it('開いた元との距離が 4px の倍数', async () => {
      const { trigger, panel } = await open(render(), 'flex-start', selector);
      const gap = panel.top - trigger.bottom;
      expect(gap).toBeGreaterThan(0);
      expect(gap % CRITERIA.grid).toBeCloseTo(0, 1);
    });

    it('画面の右端で開いても、画面の内側に収まる', async () => {
      const { panel } = await open(render(), 'flex-end', selector);
      expect(panel.left).toBeGreaterThanOrEqual(0);
      expect(panel.right).toBeLessThanOrEqual(document.documentElement.clientWidth);
    });
  });

// side は開く向きの希望で、入らない側では反対へ回ります。入れ子も同じです。
describe('開く向き（side）', () => {
  it("side='right' のメニューを画面の右端で開くと、左に回って画面の内側に収まる", async () => {
    const { trigger, panel } = await open(
      <DropdownMenu
        side="right"
        trigger={<Button>操作</Button>}
        items={[{ label: '担当をほかの人に変える', onSelect: () => {} }]}
      />,
      'flex-end',
      '.lv-menu',
    );
    expect(panel.right).toBeLessThanOrEqual(trigger.left);
    expect(panel.left).toBeGreaterThanOrEqual(0);
  });

  it('画面の右端で入れ子を開くと、左に回って画面の内側に収まる', async () => {
    const { trigger } = await open(
      <DropdownMenu
        align="end"
        trigger={<Button>操作</Button>}
        items={[
          {
            type: 'submenu',
            label: '移す',
            items: [{ label: 'ほかの拠点の倉庫へ移す', onSelect: () => {} }],
          },
        ]}
      />,
      'flex-end',
      '.lv-menu',
    );
    const row = document.querySelector<HTMLElement>('.lv-menu-item')!;
    row.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect.poll(() => document.querySelectorAll('.lv-menu').length).toBe(2);
    await new Promise(requestAnimationFrame);
    const [outer, inner] = [...document.querySelectorAll('.lv-menu')].map((el) =>
      el.getBoundingClientRect(),
    );
    expect(inner.right).toBeLessThanOrEqual(outer.left + 1);
    expect(inner.left).toBeGreaterThanOrEqual(0);
    expect(trigger.right).toBeLessThanOrEqual(document.documentElement.clientWidth);
  });
});
