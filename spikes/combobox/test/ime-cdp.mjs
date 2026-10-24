// Chromium の IME の経路（CDP の Input.imeSetComposition）で変換中の文字を入れ、絞り込みと確定を見る。
// 合成のイベントと違い、compositionstart / update / end と input はブラウザ自身が出す。
// 使い方：`npm run dev` を動かしたまま `node test/ime-cdp.mjs`。
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://127.0.0.1:5180/';
const variants = [
  ['aria', 'impl=aria'],
  ['ariakit+radix', 'impl=ariakit&shell=radix'],
  ['downshift+radix', 'impl=downshift&shell=radix'],
];
const browser = await chromium.launch();
const rows = [];
for (const [key, query] of variants)
  for (const guard of ['1', '0']) {
    const page = await browser.newPage({
      locale: 'ja-JP',
      viewport: { width: 1280, height: 1000 },
    });
    await page.goto(`${BASE}?${query}&guard=${guard}`);
    const cb = page.locator('[role=combobox]');
    await cb.focus();
    const cdp = await page.context().newCDPSession(page);
    const count = () => page.locator('[role=option]').count();
    const events = [];
    await page.exposeFunction('__ev', (e) => events.push(e));
    await page.evaluate(() => {
      for (const t of ['compositionstart', 'compositionend', 'keydown'])
        document.addEventListener(
          t,
          (e) => window.__ev(`${t}${e.key ? `:${e.key}:${e.keyCode}:${e.isComposing}` : ''}`),
          true,
        );
    });
    // 開いて、先頭を選びかけにする（Ariakit は2回）。
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(150);
    const before = await count();
    for (const text of ['と', 'とう', 'とうきょう']) {
      await cdp.send('Input.imeSetComposition', {
        text,
        selectionStart: text.length,
        selectionEnd: text.length,
      });
      await page.waitForTimeout(80);
    }
    const composing = await count();
    // 確定（Chromium はここで compositionend を出す）。
    await cdp.send('Input.insertText', { text: '東京' });
    await page.waitForTimeout(200);
    rows.push({
      variant: key,
      guard: guard === '1' ? 'あり' : 'なし',
      before,
      composing,
      after: await count(),
      input: await cb.inputValue(),
      value: await page.getByTestId('value').textContent(),
      events: [...new Set(events)].join(' '),
    });
    await page.close();
  }
await browser.close();
console.log(
  '| 土台 | KEI の守り | 変換前の候補 | 変換中の候補 | 確定後の候補 | 入力欄 | 選んだ値 |',
);
console.log('| --- | --- | --: | --: | --: | --- | --- |');
for (const r of rows)
  console.log(
    `| ${r.variant} | ${r.guard} | ${r.before} | ${r.composing} | ${r.after} | ${r.input} | ${r.value || '（なし）'} |`,
  );
console.log('\n出たイベント：', rows[0].events);
