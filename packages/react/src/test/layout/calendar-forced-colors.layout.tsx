// In forced colors (Windows high contrast) the browser drops backgrounds and box-shadow, so
// a calendar's range and chosen day need marks that stay: this checks them in Chromium.
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { cdp } from 'vitest/browser';
import { LievreProvider, Calendar } from '../../index';
import '../../styles/fonts.css';
import '../../styles/lievre.css';

let root: Root | undefined;
afterEach(async () => {
  root?.unmount();
  document.body.innerHTML = '';
  await cdp().send('Emulation.setEmulatedMedia', { features: [] });
});

const day = (n: number) =>
  [...document.querySelectorAll<HTMLElement>('.lv-calendar-day')].find(
    (b) => b.textContent === String(n),
  )!;

describe('Calendar in forced colors', () => {
  it('keeps a mark on the chosen day, the ends of the range and the days between', async () => {
    await cdp().send('Emulation.setEmulatedMedia', {
      features: [{ name: 'forced-colors', value: 'active' }],
    });
    expect(matchMedia('(forced-colors: active)').matches).toBe(true);
    const host = document.body.appendChild(document.createElement('div'));
    root = createRoot(host);
    flushSync(() =>
      root!.render(
        <LievreProvider>
          <Calendar
            today="2026-11-22"
            defaultValue="2026-11-10"
            range={{ start: '2026-11-12', end: '2026-11-15' }}
          />
        </LievreProvider>,
      ),
    );
    const plain = getComputedStyle(day(20));
    const chosen = getComputedStyle(day(10));
    expect(chosen.backgroundColor).not.toBe(plain.backgroundColor);
    for (const n of [12, 15]) expect(getComputedStyle(day(n)).outlineStyle).toBe('solid');
    expect(getComputedStyle(day(13)).outlineStyle).toBe('dashed');
    expect(plain.outlineStyle).toBe('none');
  });
});
