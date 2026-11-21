// Rows of controls on a narrow screen (a 320px phone, less the page's gutters) wrap instead of
// pushing their start out of the box, where it cannot be scrolled to.
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { ReactNode } from 'react';
import { LievreProvider, Pagination } from '../../index';
import '../../styles/fonts.css';
import '../../styles/lievre.css';

const ROWS: { name: string; selector: string; render: () => ReactNode }[] = [
  {
    name: '番号・件数の範囲・表示件数のページ送り',
    selector: '.lv-pagination',
    render: () => (
      <Pagination
        variant="numbers"
        page={6}
        totalPages={12}
        onPageChange={() => {}}
        totalCount={1280}
        pageSize={100}
        pageSizeOptions={[20, 50, 100]}
        onPageSizeChange={() => {}}
      />
    ),
  },
];

let root: Root | undefined;
afterEach(() => {
  root?.unmount();
  document.body.replaceChildren();
});

function mount(ui: ReactNode) {
  const host = document.createElement('div');
  host.style.width = '288px';
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(<LievreProvider>{ui}</LievreProvider>));
  return host;
}

for (const { name, selector, render } of ROWS)
  describe(name, () => {
    it('幅 288px でも、操作が箱の外へはみ出さない', async () => {
      const host = mount(render());
      await document.fonts.ready;
      const box = host.querySelector(selector)!.getBoundingClientRect();
      const out = [...host.querySelectorAll<HTMLElement>(`${selector} :is(button, [role=status])`)]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.left < box.left - 0.5 || r.right > box.right + 0.5)
        .map(
          ({ el, r }) =>
            `${el.textContent || el.getAttribute('aria-label')}（${r.left}〜${r.right}）`,
        );
      expect(out, `箱は ${box.left}〜${box.right}。flex-wrap で折り返してください。`).toEqual([]);
    });
  });
