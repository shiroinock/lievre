// Plays out/*.ans in xterm.js (the terminal emulator inside VS Code) in Chromium and saves
// out/*.png. Run scripts/capture.tsx first.
//   node scripts/shot.mjs
// The Lievre Term screens are shot twice: with the font installed, and without it (the fallback).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const here = new URL('../', import.meta.url);
const root = new URL('../../', here);
const out = new URL('out/', here);

// The terminal's own theme: a light one for Paper and a dark one for Ink, each with the 16 colors
// of macOS Terminal's "Basic" profile. 16-color output shows these values, not lievre's.
const ANSI = {
  black: '#000000',
  red: '#990000',
  green: '#00a600',
  yellow: '#999900',
  blue: '#0000b2',
  magenta: '#b200b2',
  cyan: '#00a6b2',
  white: '#bfbfbf',
  brightBlack: '#666666',
  brightRed: '#e50000',
  brightGreen: '#00d900',
  brightYellow: '#e5e500',
  brightBlue: '#0000ff',
  brightMagenta: '#e500e5',
  brightCyan: '#00e5e5',
  brightWhite: '#e5e5e5',
};
const THEMES = {
  paper: { ...ANSI, background: '#f3f4f8', foreground: '#121640', cursor: '#121640' },
  ink: {
    ...ANSI,
    background: '#0b0d26',
    foreground: '#eceefe',
    cursor: '#eceefe',
    brightBlue: '#5c5cff',
  },
};

const font = (path) => new URL(path, root).href;
const html = `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="${new URL('node_modules/@xterm/xterm/css/xterm.css', here).href}">
<style>
  @font-face { font-family: 'Lievre Term'; src: url('${new URL('font/LievreTerm-Regular.ttf', here).href}'); }
  @font-face { font-family: 'IBM Plex Mono'; src: url('${font('node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2')}'); }
  @font-face { font-family: 'IBM Plex Mono'; font-weight: 700; src: url('${font('node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2')}'); }
  body { margin: 0; }
  #t { display: inline-block; padding: 16px; }
</style>
<div id="t"></div>
<script src="${new URL('node_modules/@xterm/xterm/lib/xterm.js', here).href}"></script>
<script src="${new URL('node_modules/@xterm/addon-webgl/lib/addon-webgl.js', here).href}"></script>`;

const files = readdirSync(out).filter((f) => f.endsWith('.ans'));
const jobs = files.map((f) => ({ file: f, png: f.replace('.ans', '.png'), installed: true }));
for (const f of files.filter((f) => f.includes('lievre-term'))) {
  jobs.push({ file: f, png: f.replace('.ans', '-no-font.png'), installed: false });
}

const page = await (
  await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
).newPage({ deviceScaleFactor: 1 });
writeFileSync(new URL('shot.html', out), html);
for (const job of jobs) {
  await page.goto(new URL('shot.html', out).href);
  const theme = job.file.includes('-ink-') ? THEMES.ink : THEMES.paper;
  const data = readFileSync(new URL(job.file, out), 'utf8');
  // Japanese falls back to the system's Hiragino, as in a real terminal on macOS.
  const family = job.installed
    ? "'Lievre Term', 'Hiragino Sans', monospace"
    : "'IBM Plex Mono', 'Hiragino Sans', monospace";
  await page.evaluate(
    async ({ data, theme, family }) => {
      await Promise.all([
        document.fonts.load("16px 'Lievre Term'"),
        document.fonts.load("16px 'IBM Plex Mono'"),
        document.fonts.load("bold 16px 'IBM Plex Mono'"),
      ]);
      document.body.style.background = theme.background;
      const rows = data.split('\n').length;
      const term = new window.Terminal({
        cols: 60,
        rows,
        fontFamily: family,
        fontSize: 20,
        lineHeight: 1,
        theme,
        convertEol: true,
        cursorBlink: false,
        cursorStyle: 'bar',
        cursorInactiveStyle: 'none',
      });
      term.open(document.getElementById('t'));
      // The WebGL renderer keeps every glyph on the cell grid and draws box drawing itself, as
      // kitty, WezTerm, Ghostty and Windows Terminal do; private use glyphs still come from the font.
      term.loadAddon(new window.WebglAddon.WebglAddon());
      await new Promise((resolve) => term.write(data.replace(/\n+$/, ''), resolve));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    },
    { data, theme, family },
  );
  await page.locator('#t').screenshot({ path: new URL(job.png, out).pathname });
  console.log(job.png);
}
await page.context().browser().close();
