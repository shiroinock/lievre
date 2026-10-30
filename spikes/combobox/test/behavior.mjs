// 3つの土台の Combobox と、lievre の Select（Radix）に同じ操作を流し、結果を表にする。
// 使い方：spikes/combobox で `npm run dev` を動かしたまま `npm run check`（`npm run check -- downshift,aria` で一部だけ）。
// 結果は test/results.json。
// IME は合成のイベントで、Chrome の順（Enter が isComposing=true で compositionend の前）と
// Safari の順（compositionend のあとに keyCode=229 の Enter）をどちらのエンジンでも再現する。
import { chromium, webkit } from 'playwright';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.env.BASE ?? 'http://127.0.0.1:5180/';
const only = process.argv[2]?.split(',');

const variants = [
  { key: 'select', impl: 'select' },
  { key: 'aria', impl: 'aria' },
  { key: 'aria+radix', impl: 'aria', shell: 'radix' },
  { key: 'ariakit', impl: 'ariakit' },
  { key: 'ariakit+radix', impl: 'ariakit', shell: 'radix' },
  { key: 'downshift', impl: 'downshift' },
  { key: 'downshift+radix', impl: 'downshift', shell: 'radix' },
].filter((v) => !only || only.includes(v.key));

// ページの中で使う道具。
const pageHelpers = () => {
  const describe = (el) => {
    if (!el || el === document.body) return 'body';
    return (
      el.getAttribute('data-testid') ||
      el.getAttribute('role') ||
      el.getAttribute('aria-label') ||
      el.tagName.toLowerCase()
    );
  };
  window.__cb = () => document.querySelector('[role=combobox]');
  window.__list = () => {
    const cb = window.__cb();
    const id = cb?.getAttribute('aria-controls');
    return (id && document.getElementById(id)) || document.querySelector('[role=listbox]');
  };
  window.__state = () => {
    const cb = window.__cb();
    const list = window.__list();
    const visible = !!list && !list.hidden && list.getClientRects().length > 0;
    const activeId = cb?.getAttribute('aria-activedescendant');
    let active = activeId ? (document.getElementById(activeId)?.textContent ?? '(missing)') : null;
    if (!active && document.activeElement?.getAttribute('role') === 'option')
      active = document.activeElement.textContent;
    return {
      expanded: cb?.getAttribute('aria-expanded'),
      visible,
      count: visible ? list.querySelectorAll('[role=option]').length : 0,
      active,
      input: cb?.value ?? cb?.textContent ?? null,
      caret: cb?.selectionStart ?? null,
      value: document.querySelector('[data-testid=value]')?.textContent ?? null,
      focus: describe(document.activeElement),
      dialog: document.querySelector('[data-testid=dialog-state]')?.textContent,
      clicks: document.querySelector('[data-testid=clicks]')?.textContent,
      scrollY: Math.round(window.scrollY),
    };
  };
  // IME の変換中。読みを1文字ずつ入れる（keydown は key='Process'・keyCode=229）。
  window.__ime = (steps) => {
    const cb = window.__cb();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    const base = cb.value;
    cb.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
    for (const s of steps) {
      window.__imeKey('Process');
      setter.call(cb, base + s);
      cb.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: s }));
      cb.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          data: s,
          inputType: 'insertCompositionText',
          isComposing: true,
        }),
      );
    }
  };
  // 確定。order='chrome' は Enter（isComposing=true）→ compositionend、'safari' は compositionend → Enter（isComposing=false）。
  window.__imeCommit = (commit, order, enter = true) => {
    const cb = window.__cb();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    const key = (k, composing) => window.__imeKey(k, composing);
    const value = cb.value.replace(/[ぁ-ん]+$/, '') + commit; // 変換中の読みを確定の文字に置き換える
    if (order === 'chrome' && enter) key('Enter', true);
    setter.call(cb, value);
    cb.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: commit,
        inputType: 'insertCompositionText',
        isComposing: true,
      }),
    );
    cb.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: commit }));
    if (order === 'safari' && enter) key('Enter', false);
  };
  window.__imeKey = (k, composing = true) => {
    const cb = window.__cb();
    const ev = new KeyboardEvent('keydown', {
      key: k,
      bubbles: true,
      cancelable: true,
      isComposing: composing,
    });
    Object.defineProperty(ev, 'keyCode', { get: () => 229 });
    Object.defineProperty(ev, 'which', { get: () => 229 });
    cb.dispatchEvent(ev);
  };
};

async function open(page, v, ctx, extra = '') {
  const q = new URLSearchParams({ impl: v.impl, ...(v.shell ? { shell: v.shell } : {}), ctx });
  await page.goto(`${BASE}?${q}${extra}`);
  await page.addScriptTag({ content: `(${pageHelpers})()` });
  if (ctx === 'dialog') {
    await page.getByTestId('dialog-trigger').click();
    await page.locator('[role=dialog]').waitFor();
  }
  await page.locator('[role=combobox]').waitFor();
  await page.locator('[role=combobox]').focus();
}
const state = (page) => page.evaluate(() => window.__state());
const wait = (page, ms = 120) => page.waitForTimeout(ms);
const press = async (page, key) => {
  await page.keyboard.press(key);
  await wait(page);
};
const typeText = async (page, text) => {
  await page.keyboard.insertText(text);
  await wait(page);
};

// ---- 操作の手順。select は Radix の Select で、同じ操作を比べる基準にする。
const isSelect = (v) => v.impl === 'select';
const scenarios = {
  async arrows(page, v) {
    const r = {};
    await press(page, 'ArrowDown');
    r.down1 = await state(page);
    if (isSelect(v)) await wait(page, 300);
    await press(page, 'ArrowDown');
    r.down2 = await state(page);
    await press(page, 'End');
    r.end = await state(page);
    await press(page, 'Home');
    r.home = await state(page);
    await press(page, 'ArrowUp');
    r.upFromFirst = await state(page);
    return r;
  },
  async enter(page, v) {
    await press(page, 'ArrowDown');
    if (isSelect(v)) await wait(page, 300);
    else await press(page, 'ArrowDown');
    await press(page, 'Enter');
    const afterEnter = await state(page);
    await press(page, 'ArrowDown');
    if (isSelect(v)) await wait(page, 300);
    const reopened = await state(page);
    const selectedAttr = await page.evaluate(() =>
      [...(window.__list()?.querySelectorAll('[role=option]') ?? [])]
        .filter((o) => o.getAttribute('aria-selected') === 'true')
        .map((o) => o.textContent),
    );
    return { afterEnter, reopened, selectedAttr };
  },
  async escape(page, v) {
    const r = {};
    if (isSelect(v)) await press(page, 'ArrowDown');
    else await typeText(page, 'とうきょう');
    if (isSelect(v)) await wait(page, 300);
    r.opened = await state(page);
    await press(page, 'Escape');
    r.esc1 = await state(page);
    await press(page, 'Escape');
    r.esc2 = await state(page);
    await press(page, 'Escape');
    r.esc3 = await state(page);
    return r;
  },
  async tab(page, v) {
    await press(page, 'ArrowDown');
    if (isSelect(v)) await wait(page, 300);
    await press(page, 'ArrowDown');
    const before = await state(page);
    await press(page, 'Tab');
    return { before, after: await state(page) };
  },
  async outside(page, v, ctx) {
    await press(page, 'ArrowDown');
    if (isSelect(v)) await wait(page, 300);
    const before = await state(page);
    const target = ctx === 'dialog' ? 'inside' : 'outside';
    // 座標で実際に押す（Radix は pointerdown を見る）。Select のように外側の pointer-events を止める部品もあるので、
    // Playwright の「押せるか」の確かめは通さない。
    const box = await page.getByTestId(target).boundingBox();
    const clickError = box ? null : 'no box';
    if (box) await page.mouse.click(box.x + 8, box.y + box.height / 2);
    await wait(page, 200);
    return { before, after: await state(page), clickError };
  },
  async pickWithPointer(page, v) {
    await press(page, 'ArrowDown');
    if (isSelect(v)) await wait(page, 300);
    const option = page.locator('[role=option]').nth(1);
    const box = await option.boundingBox();
    const hit = box
      ? await page.evaluate(
          ({ x, y }) => {
            const el = document.elementFromPoint(x, y);
            return { role: el?.closest('[role=option]') ? 'option' : el?.className || el?.tagName };
          },
          { x: box.x + box.width / 2, y: box.y + box.height / 2 },
        )
      : null;
    const portal = await page.evaluate(() => {
      const list = window.__list();
      const surface = list?.closest('.lievre-portal');
      return {
        surfaceTheme: surface?.getAttribute('data-theme') ?? null,
        underBody: surface?.parentElement === document.body,
        listPointerEvents: list ? getComputedStyle(list).pointerEvents : null,
        ariaHiddenAncestor: !!list?.closest('[aria-hidden=true]'),
        zIndex: list
          ? getComputedStyle(list.closest('[data-radix-popper-content-wrapper]') ?? list).zIndex
          : null,
      };
    });
    const clickError = box ? null : 'no box';
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await wait(page, 200);
    return { hit, clickError, portal, after: await state(page) };
  },
  async normalize(page, v) {
    if (isSelect(v)) return { skipped: true };
    const r = {};
    for (const q of ['かぶしき', 'ｶﾌﾞｼｷ', 'カブシキ', 'abc', 'ＡＢＣ', 'やまだ', 'xyz', 'ｘｙｚ']) {
      await page.locator('[role=combobox]').fill('');
      await typeText(page, q);
      await page
        .locator('[role=option]')
        .first()
        .waitFor({ timeout: 1000 })
        .catch(() => {});
      r[q] = (await state(page)).count;
    }
    return r;
  },
  // IME：変換を始める前に候補を1つ選んだ状態にして、Enter で誤って確定しないかを見る。
  async imeChrome(page, v) {
    return imeRun(page, v, 'chrome');
  },
  async imeSafari(page, v) {
    return imeRun(page, v, 'safari');
  },
  // 変換中の Esc（変換の取り消し）。Safari は key='Escape'・keyCode=229 で来る。ダイアログが閉じないか。
  async imeEscape(page, v) {
    if (isSelect(v)) return { skipped: true };
    await typeText(page, 'とう');
    await page.evaluate(() => window.__ime(['き']));
    await wait(page);
    const before = await state(page);
    await page.evaluate(() => window.__imeKey('Escape'));
    await wait(page);
    return { before, after: await state(page) };
  },
  async a11y(page, v) {
    if (!isSelect(v)) await typeText(page, 'とうきょう');
    else await press(page, 'ArrowDown');
    await wait(page, 400);
    await page.addScriptTag({ content: axeSource });
    const axe = await page.evaluate(async () => {
      // ページの作りの指摘（main・h1・region）は試作のページのもので、部品とは関係ないので外す。
      const r = await window.axe.run(document, {
        resultTypes: ['violations'],
        rules: {
          'landmark-one-main': { enabled: false },
          'page-has-heading-one': { enabled: false },
          region: { enabled: false },
        },
      });
      return r.violations.map((x) => `${x.id}(${x.nodes.length})`);
    });
    const attrs = await page.evaluate(() => {
      const cb = window.__cb();
      const list = window.__list();
      const labelled = (el) =>
        el?.getAttribute('aria-label') ||
        (el?.getAttribute('aria-labelledby') ?? '')
          .split(' ')
          .map((id) => document.getElementById(id)?.textContent)
          .join(' ') ||
        [...(el?.labels ?? [])].map((l) => l.textContent).join(' ');
      return {
        name: labelled(cb),
        describedby: (cb?.getAttribute('aria-describedby') ?? '')
          .split(' ')
          .map((id) => document.getElementById(id)?.textContent ?? `(missing ${id})`)
          .join(' / '),
        autocomplete: cb?.getAttribute('aria-autocomplete'),
        controls: !!cb?.getAttribute('aria-controls'),
        listName: labelled(list),
        live: [...document.querySelectorAll('[aria-live], [role=status], [role=log]')]
          .map((n) => n.textContent.trim())
          .filter(Boolean),
      };
    });
    await press(page, 'ArrowDown');
    const activeAnnounce = await state(page);
    return { axe, attrs, active: activeAnnounce.active };
  },
};

async function imeRun(page, v, order) {
  if (isSelect(v)) return { skipped: true };
  const r = {};
  // 一覧を開いて先頭を選びかけた状態から、「とうきょう」を変換して「東京」で確定する。
  // Ariakit は1回目の矢印で開くだけなので、選びかけの候補ができるまで押す。
  for (let i = 0; i < 3 && !(await state(page)).active; i++) await press(page, 'ArrowDown');
  r.start = await state(page);
  await page.evaluate(() => window.__ime(['と', 'とう', 'とうきょう']));
  await wait(page);
  r.composing = await state(page);
  // 変換中の矢印（変換候補の選び直し）で、一覧の選びかけが動かないか。
  await page.evaluate(() => window.__imeKey('ArrowDown'));
  await wait(page);
  r.arrowWhileComposing = await state(page);
  await page.evaluate((o) => window.__imeCommit('東京', o), order);
  await wait(page, 200);
  r.committed = await state(page);
  return r;
}

const results = [];
for (const [name, type] of [
  ['chromium', chromium],
  ['webkit', webkit],
]) {
  const browser = await type.launch();
  for (const v of variants) {
    for (const ctx of ['plain', 'dialog']) {
      for (const [sname, fn] of Object.entries(scenarios)) {
        const page = await browser.newPage({
          locale: 'ja-JP',
          viewport: { width: 1280, height: 1000 },
        });
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
        let out;
        try {
          await open(page, v, ctx);
          out = await fn(page, v, ctx);
        } catch (e) {
          out = { error: String(e.message).split('\n')[0] };
        }
        results.push({ browser: name, variant: v.key, ctx, scenario: sname, ...out, errors });
        await page.close();
      }
      // IME の守りを外して、土台そのものの扱いを見る。
      if (!isSelect(v))
        for (const sname of ['imeChrome', 'imeSafari', 'imeEscape']) {
          const page = await browser.newPage({
            locale: 'ja-JP',
            viewport: { width: 1280, height: 1000 },
          });
          await open(page, v, ctx, '&guard=0');
          const out = await scenarios[sname](page, v, ctx).catch((e) => ({
            error: String(e.message).split('\n')[0],
          }));
          results.push({
            browser: name,
            variant: v.key,
            ctx,
            scenario: `${sname}:noguard`,
            ...out,
          });
          await page.close();
        }
      // テーマの引き継ぎ（ink）。
      const page = await browser.newPage();
      await open(page, v, ctx, '&theme=ink');
      await page.addScriptTag({ content: `(${pageHelpers})()` });
      await press(page, 'ArrowDown');
      await wait(page, 300);
      const theme = await page.evaluate(() => {
        const list = window.__list();
        return {
          surfaceTheme: list?.closest('.lievre-portal')?.getAttribute('data-theme') ?? null,
          background: list
            ? getComputedStyle(list.closest('.lv-combobox-popover, .lv-select-content') ?? list)
                .backgroundColor
            : null,
        };
      });
      results.push({ browser: name, variant: v.key, ctx, scenario: 'theme', ...theme });
      await page.close();
      process.stdout.write('.');
    }
  }
  await browser.close();
}
// 一部の土台だけを流したときは、前の結果のほかの土台を残して混ぜる。
const file = new URL('./results.json', import.meta.url);
const kept =
  only && existsSync(file)
    ? JSON.parse(readFileSync(file)).filter((r) => !only.includes(r.variant))
    : [];
writeFileSync(file, JSON.stringify([...kept, ...results], null, 2));
console.log(`\n${results.length} 件を test/results.json に書きました`);
