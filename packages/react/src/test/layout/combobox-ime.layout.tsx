// Conversion through Chromium's own IME path (CDP Input.imeSetComposition): the browser itself
// sends compositionstart / update / end and input, which jsdom's made-up events cannot show.
// It guards the shape decided in docs/combobox-foundation.md: Downshift keeps the text, because
// controlling it from outside breaks the IME's range (「ととうとうきょう東京」).
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { cdp, userEvent } from 'vitest/browser';
import { useState } from 'react';
import { LievreProvider, Combobox } from '../../index';
import '../../styles/fonts.css';
import '../../styles/lievre.css';

const OPTIONS = [
  { value: 'tokyo', label: '東京', kana: 'とうきょう' },
  { value: 'kyoto', label: '京都', kana: 'きょうと' },
  { value: 'osaka', label: '大阪', kana: 'おおさか' },
  { value: 'toyama', label: '富山', kana: 'とやま' },
];

function Picker() {
  const [value, setValue] = useState<string | null>(null);
  return (
    <>
      <Combobox label="都市" options={OPTIONS} value={value} onValueChange={setValue} />
      <output data-testid="value">{value ?? ''}</output>
    </>
  );
}

let root: Root | undefined;
afterEach(() => {
  root?.unmount();
  document.body.innerHTML = '';
});
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const count = () => document.querySelectorAll('[role=option]').length;

describe('Combobox through the IME of Chromium', () => {
  it('neither filters nor chooses while converting, and filters by the committed text', async () => {
    const host = document.body.appendChild(document.createElement('div'));
    root = createRoot(host);
    flushSync(() =>
      root!.render(
        <LievreProvider>
          <Picker />
        </LievreProvider>,
      ),
    );
    const input = document.querySelector<HTMLInputElement>('[role=combobox]')!;
    input.focus();
    await userEvent.keyboard('{ArrowDown}');
    await wait(100);
    const before = count();
    expect(before).toBe(OPTIONS.length);
    const session = cdp();
    for (const text of ['と', 'とう', 'とうきょう']) {
      await session.send('Input.imeSetComposition', {
        text,
        selectionStart: text.length,
        selectionEnd: text.length,
      });
      await wait(60);
      expect(input.value).toBe(text);
    }
    expect(count()).toBe(before);
    await session.send('Input.insertText', { text: '東京' });
    await wait(150);
    expect(input.value).toBe('東京');
    expect(count()).toBe(1);
    expect(document.querySelector('[data-testid=value]')!.textContent).toBe('');
  });
});
