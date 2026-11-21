// A table with maxHeight keeps its heading row at the top while the rows scroll under it.
// Moving focus back up with Shift+Tab must not leave the focused control under that row
// (WCAG 2.4.11).
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { userEvent } from 'vitest/browser';
import { LievreProvider, DataTable } from '../../index';
import '../../styles/fonts.css';
import '../../styles/lievre.css';

type Row = { id: string; name: string };
const rows: Row[] = Array.from({ length: 30 }, (_, i) => ({
  id: `r${String(i + 1).padStart(2, '0')}`,
  name: `案件 ${i + 1}`,
}));

let root: Root | undefined;
afterEach(() => {
  root?.unmount();
  document.body.replaceChildren();
});

describe('見出しを固定した表', () => {
  for (const density of ['comfortable', 'compact'] as const) {
    it(`${density}：戻るフォーカスが見出しの下に隠れない`, async () => {
      const host = document.createElement('div');
      document.body.append(host);
      root = createRoot(host);
      flushSync(() =>
        root!.render(
          <LievreProvider density={density}>
            <DataTable
              caption="案件"
              rows={rows}
              getRowId={(r) => r.id}
              selectable
              maxHeight="16rem"
              columns={[{ key: 'name', header: '案件', render: (r) => r.name }]}
            />
          </LievreProvider>,
        ),
      );
      const wrap = host.querySelector<HTMLElement>('.lv-table-wrap')!;
      const boxes = [...host.querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]')];
      // Start at the last row, then walk back up one control at a time.
      boxes.at(-1)!.focus();
      for (let i = boxes.length - 2; i >= 0; i--) {
        await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
        expect(document.activeElement).toBe(boxes[i]);
        // The sticky cells move, not the thead, so measure a heading cell.
        const head = wrap.querySelector('thead th')!.getBoundingClientRect();
        const box = boxes[i]!.getBoundingClientRect();
        expect(box.top, `${rows[i]!.id} の選択`).toBeGreaterThanOrEqual(head.bottom);
      }
    });
  }
});
