// Monospace ranges and screens: Japanese included, every part inside follows, lines stay on the
// 4px grid, Latin is half as wide as Japanese, and no text drops below the mono floor.
// stories.layout.tsx also measures every story on two monospace screens.
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { ReactNode } from 'react';
import {
  Badge,
  Button,
  Card,
  Heading,
  LievreProvider,
  Text,
  type Family,
  type Typography,
} from '../../index';
import '../../styles/fonts.css';
import '../../styles/lievre.css';
import { checkPart } from './checks';

let root: Root | undefined;
afterEach(() => {
  root?.unmount();
  document.body.replaceChildren();
});

async function render(node: ReactNode) {
  const host = document.body.appendChild(document.createElement('div'));
  root = createRoot(host);
  flushSync(() => root!.render(node));
  await document.fonts.ready;
  await Promise.all(
    ['Lievre Sans', 'Lievre Mono'].flatMap((f) =>
      [400, 500, 600].map((w) => document.fonts.load(`${w} 16px '${f}'`, 'あ漢a0')),
    ),
  );
  return host;
}

const face = (el: Element) =>
  getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim();
/** The mono floor in px: --lv-text-mono-min is 0.9rem. */
const floor = () => 0.9 * parseFloat(getComputedStyle(document.documentElement).fontSize);
/** Every element that holds text of its own, inside `scope`. */
const texts = (scope: Element) =>
  [scope, ...scope.querySelectorAll('*')].filter((el) =>
    [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()),
  );

function expectMono(scope: Element) {
  const found = texts(scope);
  expect(found.length).toBeGreaterThan(0);
  for (const el of found) {
    const s = getComputedStyle(el);
    const what = `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}「${el.textContent?.trim().slice(0, 12)}」`;
    expect(face(el), `${what} の書体`).toBe('Lievre Mono');
    expect(parseFloat(s.fontSize), `${what} の大きさ`).toBeGreaterThanOrEqual(floor() - 0.01);
    const lh = parseFloat(s.lineHeight);
    if (!Number.isNaN(lh)) expect(lh % 4, `${what} の行の高さ ${lh}px`).toBeCloseTo(0, 1);
  }
}

/** Two Latin characters are as wide as one Japanese, at the size the scope draws. */
function expectHalfWidth(scope: Element) {
  // Inside every element that holds text too: headings, the eyebrow and card titles carry their own
  // tracking and 'palt', which a span at the top of the scope would not see.
  for (const host of [scope, ...texts(scope)]) {
    const probe = (text: string) => {
      const span = host.appendChild(document.createElement('span'));
      span.textContent = text;
      const width = span.getBoundingClientRect().width;
      span.remove();
      return width;
    };
    // Kana as well as kanji: 'palt' narrows kana.
    const ja = probe('かなとカナ漢字');
    const latin = probe('abcdefg0123456');
    const what = `${host.tagName.toLowerCase()}.${[...host.classList].join('.')}`;
    // Advances land on 1/64px, so fourteen characters may drift by up to 14/64px.
    expect(
      Math.abs(latin - ja),
      `${what} の中で、英数字 14 字（${latin}px）と日本語 7 字（${ja}px）の差`,
    ).toBeLessThanOrEqual(14 / 64);
  }
}

const PARTS = (
  <>
    <Text>ログ：2026-11-23 01:42 保存しました（12 件）</Text>
    <Text size="small">補助：差分は +3 −1 行</Text>
    <Badge tone="success">稼働中</Badge>
    <Button>再実行する</Button>
    <Heading level={3} size="subsection">
      かなの見出し
    </Heading>
  </>
);

describe('範囲を等幅にする', () => {
  for (const typography of ['standard', 'interface'] as Typography[]) {
    it(`Card の mono（本文の書体の画面・${typography}）`, async () => {
      const host = await render(
        <LievreProvider typography={typography}>
          <p className="outside">外の文はそのまま</p>
          <Card title="実行の記録" eyebrow="夜間の処理" mono>
            {PARTS}
          </Card>
        </LievreProvider>,
      );
      const card = host.querySelector('.lv-card')!;
      expectMono(card);
      expectHalfWidth(card);
      expect(face(host.querySelector('.outside')!)).toBe('Lievre Sans');
      const { violations } = checkPart(
        { name: 'カード', selector: '.lv-card, .lv-card .lv-text', checks: ['line-grid'] },
        host,
      );
      expect(violations.map((v) => v.message)).toEqual([]);
    });

    it(`Text の mono（${typography}）`, async () => {
      const host = await render(
        <LievreProvider typography={typography}>
          <Text mono>$ npm run build # 書き出す</Text>
        </LievreProvider>,
      );
      const text = host.querySelector('.lv-text')!;
      expectMono(text);
      expectHalfWidth(text);
    });
  }

  it('クラス lv-family-mono で、ほかの要素も中の部品ごと等幅にする', async () => {
    const host = await render(
      <LievreProvider typography="interface">
        <div className="lv-family-mono">
          差分の一覧
          {PARTS}
        </div>
      </LievreProvider>,
    );
    const range = host.querySelector('.lv-family-mono')!;
    expectMono(range);
    expectHalfWidth(range);
  });
});

describe('範囲の本文の大きさ', () => {
  it('いちばん近い provider の typography で決まる', async () => {
    const host = await render(
      <LievreProvider typography="interface">
        <Text mono className="outer">
          外は 14px なので等幅の最小の 14.4px
        </Text>
        <LievreProvider typography="standard">
          <Text mono className="inner">
            中は 16px のまま
          </Text>
        </LievreProvider>
      </LievreProvider>,
    );
    expect(getComputedStyle(host.querySelector('.outer')!).fontSize).toBe(`${floor()}px`);
    expect(getComputedStyle(host.querySelector('.inner')!).fontSize).toBe('16px');
  });
});

describe('画面を等幅にする', () => {
  for (const typography of ['standard', 'interface'] as Typography[]) {
    it(`LievreProvider の family="mono"（${typography}）`, async () => {
      const host = await render(
        <LievreProvider family="mono" typography={typography}>
          <Card title="実行の記録" eyebrow="夜間の処理">
            {PARTS}
          </Card>
        </LievreProvider>,
      );
      const screen = host.querySelector('.lievre')!;
      expect(screen.getAttribute('data-family')).toBe('mono');
      expectMono(screen);
      expectHalfWidth(screen);
      const { violations } = checkPart(
        { name: '画面', selector: '.lv-card, .lv-text', checks: ['line-grid'] },
        host,
      );
      expect(violations.map((v) => v.message)).toEqual([]);
    });
  }

  it('入れ子は指定しない値を外から引き継ぎ、family="sans" で本文の書体に戻せる', async () => {
    const host = await render(
      <LievreProvider family="mono" typography="interface">
        <LievreProvider theme="ink">
          <p className="inherited">引き継ぐ</p>
          <LievreProvider family={'sans' as Family}>
            <p className="back">本文の書体に戻す</p>
            <Heading className="back-heading">見出しは字間と詰めも戻る</Heading>
          </LievreProvider>
        </LievreProvider>
      </LievreProvider>,
    );
    const [, inner, back] = [...host.querySelectorAll('.lievre')];
    expect(inner!.getAttribute('data-family')).toBe('mono');
    expect(inner!.getAttribute('data-typography')).toBe('interface');
    expect(face(host.querySelector('.inherited')!)).toBe('Lievre Mono');
    expect(back!.getAttribute('data-family')).toBe('sans');
    expect(back!.getAttribute('data-theme')).toBe('ink');
    expect(face(host.querySelector('.back')!)).toBe('Lievre Sans');
    const heading = getComputedStyle(host.querySelector('.back-heading')!);
    expect(heading.fontFeatureSettings).toContain('palt');
    expect(parseFloat(heading.letterSpacing)).toBeGreaterThan(0);
  });
});
