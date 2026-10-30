// Measures the baked worn faces against the plain ones in the browser: every string keeps its
// width, Latin stays half as wide as kana and kanji, and outlines move only within their own box.
// The results are also left on window.__keiWearFontCheck for scripted checks.
import { useEffect, useState } from 'react';
import { Badge, Heading, Text } from '../index';

const WEIGHTS = [400, 500, 600];
const STRINGS = ['0123456789', 'SYN-20481', '12:34:56', '98.4%', '計測ラボの同期', 'Wear 擦れ'];
const PAIRS = [
  {
    name: 'KEI Mono',
    plain: "'KEI Mono', 'IBM Plex Sans JP'",
    worn: "'KEI Worn Mono', 'KEI Worn Sans'",
  },
  { name: 'Plex Sans JP', plain: "'IBM Plex Sans JP'", worn: "'KEI Worn Sans'" },
];
const INK = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const SIZE = 64;
const WORN = ['KEI Worn Mono', 'KEI Worn Sans'];
// Every character measured below: each one may sit in its own subset file.
const MEASURED = [...new Set([...STRINGS, INK, 'あA'].join(''))].join('');
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Result = {
  loaded: boolean;
  widths: { pair: string; weight: number; text: string; delta: number }[];
  ratio: number[];
  ink: { mean: number; max: number; limit: number };
  pass: boolean;
};

/** The worn faces' @font-face rules on the page, as the addresses of their files. */
function wornSources() {
  const sources: string[] = [];
  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of rules)
      if (
        rule instanceof CSSFontFaceRule &&
        WORN.includes(rule.style.getPropertyValue('font-family').replace(/['"]/g, '').trim())
      )
        sources.push(rule.style.getPropertyValue('src'));
  }
  return sources;
}

/**
 * Waits until the page holds the faces baked last (wear-fonts/current.json names their folder)
 * and every subset the measured text needs has loaded. After a save the new @font-face list
 * arrives by hot update, about 375 files; measuring before then compares a fallback face. Resolves
 * to false when nothing is baked.
 */
async function wornFacesReady() {
  const current = await fetch('/wear-fonts/current.json', { cache: 'no-store' })
    .then((r) => (r.ok ? (r.json() as Promise<{ dir: string }>) : null))
    .catch(() => null);
  if (!current) return false;
  const folder = `/${current.dir.split('/').pop()}/`;
  for (let tries = 0; tries < 120; tries++) {
    const sources = wornSources();
    if (sources.length && sources.every((src) => src.includes(folder))) break;
    await sleep(250);
  }
  const families = ['KEI Mono', ...WORN, 'IBM Plex Sans JP'];
  const fonts = families.flatMap((f) => WEIGHTS.map((w) => `${w} 16px '${f}'`));
  await Promise.all(fonts.map((font) => document.fonts.load(font, MEASURED)));
  await document.fonts.ready;
  return (
    wornSources().every((src) => src.includes(folder)) &&
    fonts.every((font) => document.fonts.check(font, MEASURED))
  );
}

async function measure(reach: number): Promise<Result> {
  const loaded = await wornFacesReady();
  const ctx = document.createElement('canvas').getContext('2d')!;
  const width = (font: string, text: string) => {
    ctx.font = font;
    return ctx.measureText(text).width;
  };
  const widths = PAIRS.flatMap((p) =>
    WEIGHTS.flatMap((weight) =>
      STRINGS.map((text) => ({
        pair: p.name,
        weight,
        text,
        delta:
          width(`${weight} ${SIZE}px ${p.worn}`, text) -
          width(`${weight} ${SIZE}px ${p.plain}`, text),
      })),
    ),
  );
  // One Latin character of KEI Mono is half a kana or kanji.
  const ratio = WEIGHTS.map(
    (w) =>
      width(`${w} ${SIZE}px ${PAIRS[0].worn}`, 'あ') /
      width(`${w} ${SIZE}px ${PAIRS[0].worn}`, 'A'),
  );
  // Left ink edges move by the worn edge only; a misplaced origin would shift them all one way.
  const edges = [...INK].map((ch) => {
    ctx.font = `400 ${SIZE}px ${PAIRS[0].worn}`;
    const worn = -ctx.measureText(ch).actualBoundingBoxLeft;
    ctx.font = `400 ${SIZE}px ${PAIRS[0].plain}`;
    return worn - -ctx.measureText(ch).actualBoundingBoxLeft;
  });
  const mean = edges.reduce((a, b) => a + b, 0) / edges.length;
  const max = Math.max(...edges.map(Math.abs));
  const limit = (reach / 1000) * SIZE * 0.83333 + 1;
  const pass =
    loaded &&
    widths.every((w) => Math.abs(w.delta) < 0.01) &&
    ratio.every((r) => Math.abs(r - 2) < 0.001) &&
    max <= limit &&
    Math.abs(mean) < limit / 2;
  return { loaded, widths, ratio, ink: { mean, max, limit }, pass };
}

/**
 * reach is how far the saved values move an edge (1/1000 em); stamp changes whenever new worn
 * faces have been baked, so the check runs again.
 */
export function FontCheck({ reach, stamp }: { reach: number; stamp: number }) {
  const [result, setResult] = useState<Result>();
  useEffect(() => {
    let current = true;
    setResult(undefined);
    measure(reach).then((r) => {
      if (!current) return;
      setResult(r);
      (window as unknown as { __keiWearFontCheck: Result }).__keiWearFontCheck = r;
    });
    return () => {
      current = false;
    };
  }, [reach, stamp]);
  const worst = result ? Math.max(...result.widths.map((w) => Math.abs(w.delta))) : 0;
  return (
    <section aria-labelledby="tune-fonts" className="tune-fonts">
      <Heading level={2} size="section" id="tune-fonts">
        焼き込んだフォントの位置{' '}
        {result ? (
          <Badge tone={result.pass ? 'success' : 'danger'} dot>
            {result.pass ? '一致' : result.loaded ? 'ずれあり' : '未生成'}
          </Badge>
        ) : (
          <Badge tone="neutral" dot>
            確認中
          </Badge>
        )}
      </Heading>
      <Text size="small" tone="muted">
        上が普通の字、下が焼き込んだ字です。縦の線は 0.5em
        ごとで、英数字は1マス、かなと漢字は2マスに収まります。
      </Text>
      <div className="tune-grid">
        <div style={{ fontFamily: PAIRS[0].plain }}>あ計12AB:34 98.4% SYN-20481</div>
        <div style={{ fontFamily: PAIRS[0].worn }}>あ計12AB:34 98.4% SYN-20481</div>
      </div>
      {!result && (
        <Text size="small" tone="muted">
          焼き込んだフォントが揃うのを待って測ります。
        </Text>
      )}
      {result && (
        <Text size="small">
          {result.loaded
            ? `幅の差は最大 ${worst.toFixed(3)}px（${SIZE}px、${result.widths.length}通り）。かなと英字の幅の比 ${result.ratio.map((r) => r.toFixed(3)).join(' / ')}。字の左端は平均 ${result.ink.mean.toFixed(2)}px、最大 ${result.ink.max.toFixed(2)}px 動き、許容 ${result.ink.limit.toFixed(2)}px。`
            : '焼き込んだフォントがないか、読み込めませんでした。npm run wear:font を実行するか、保存してください。'}
        </Text>
      )}
    </section>
  );
}
