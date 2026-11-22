// Opening the list scrolls it to the option being chosen: the list is in a portal that Radix
// fills on a later commit, so the scroll has to wait for it. jsdom has no layout to show this.
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { userEvent } from 'vitest/browser';
import { LievreProvider, Combobox } from '../../index';
import '../../styles/fonts.css';
import '../../styles/lievre.css';

const OPTIONS = Array.from({ length: 40 }, (_, i) => ({
  value: `v${i + 1}`,
  label: `取引先 ${i + 1}`,
}));

let root: Root | undefined;
afterEach(() => {
  root?.unmount();
  document.body.innerHTML = '';
});
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Whether the option is inside what the list shows. */
function shown(option: Element) {
  const list = option.closest('.lv-combobox-list')!.getBoundingClientRect();
  const box = option.getBoundingClientRect();
  return box.top >= list.top - 1 && box.bottom <= list.bottom + 1;
}

describe('Combobox list scrolling', () => {
  for (const [how, open] of [
    ['the arrow key', () => userEvent.keyboard('{ArrowDown}')],
    ['the button', () => userEvent.click(document.querySelector('.lv-combobox-button')!)],
  ] as const)
    it(`shows the chosen option far down the list when opened with ${how}`, async () => {
      const host = document.body.appendChild(document.createElement('div'));
      root = createRoot(host);
      flushSync(() =>
        root!.render(
          <LievreProvider>
            <Combobox label="取引先" options={OPTIONS} defaultValue="v38" />
          </LievreProvider>,
        ),
      );
      document.querySelector<HTMLInputElement>('[role=combobox]')!.focus();
      await open();
      await wait(150);
      const chosen = [...document.querySelectorAll('[role=option]')].find(
        (o) => o.textContent === '取引先 38',
      )!;
      expect(chosen.getAttribute('aria-selected')).toBe('true');
      expect(shown(chosen)).toBe(true);
    });
});
