// Dev-server endpoints for the wear tuning page (npm run wear:tune). Only `vite` serve loads this,
// and it answers only requests from this machine, so nothing in a build can write the config.
//   GET  /__kei-wear/config  the saved wear.config.json
//   POST /__kei-wear/config  save values, regenerate src/styles/wear/ and start the font build
//   GET  /__kei-wear/status  the font build's progress
//   POST /__kei-wear/preview bake only the sample characters with unsaved values (about 2s)
//   GET  /__kei-wear/preview/<key>/<file>  a face baked by the preview
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { normaliseConfig, TEXT_KINDS } from '../../src/wear/presets.mjs';
import { contrastGauge } from '../../src/wear/gauges.mjs';
import { ageContrast } from '../../src/wear/age.mjs';
import { outlineEnv, readConfig, writeWear } from '../build-wear.mjs';
import { missingMessage, wearPython } from './python.mjs';

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const RANGES = {
  'outline.rough': [0, 20],
  'outline.roughScale': [8, 60],
  'outline.swell': [0, 12],
  'outline.swellScale': [80, 400],
  'outline.step': [6, 30],
  'kasure.density': [1, 16],
  'kasure.threshold': [0.3, 0.95],
  'kasure.floor': [0.5, 1],
  'stain.strength': [0, 0.2],
  'yake.strength': [0, 0.6],
  'yake.reach': [40, 320],
  'yake.mottle': [0, 1],
  'yake.corner': [0, 1],
  'yake.surfaces': [0, 1],
  'sure.density': [0, 1],
  'sure.strength': [0, 0.8],
  'sure.fold': [0, 1],
  'age.fade': [0, 1],
  'age.shift': [0, 1.5],
  'age.mottle': [0, 1],
  'age.rules': [0, 1],
  'age.chips': [0, 1],
};
const COLOUR = /^#[0-9a-f]{6}$/i;

/** Returns the reasons a config cannot be saved; an empty list means it can. */
export function validate(config, tokens) {
  const problems = [];
  if (!/^[\w-]{1,40}$/.test(config.salt))
    problems.push('ソルトは英数字と - _ で40文字までにしてください。');
  for (const [path, [lo, hi]] of Object.entries(RANGES)) {
    const value = path.split('.').reduce((o, k) => o[k], config);
    if (typeof value !== 'number' || !(value >= lo && value <= hi))
      problems.push(`${path} は ${lo}〜${hi} にしてください。`);
  }
  for (const [theme, tone] of Object.entries(config.tones)) {
    if (
      !COLOUR.test(tone.yake) ||
      !COLOUR.test(tone.sure) ||
      !(tone.amount >= 0 && tone.amount <= 1.5)
    )
      problems.push(`tones.${theme} の値が正しくありません（色は #rrggbb、amount は 0〜1.5）。`);
  }
  for (const kind of Object.keys(TEXT_KINDS)) {
    const { distort, kasure } = config.kinds[kind];
    if (typeof distort !== 'boolean' || !(kasure >= 0 && kasure <= 1))
      problems.push(`kinds.${kind} の値が正しくありません。`);
  }
  for (const [theme, { ui }] of Object.entries(contrastGauge(config, tokens)))
    if (ui < 3)
      problems.push(
        `${theme} で操作の輪郭かフォーカスのコントラストが ${ui.toFixed(2)}:1 になります（3:1 未満）。`,
      );
  for (const [theme, { min }] of Object.entries(contrastGauge(config, tokens)))
    if (min < 4.5)
      problems.push(
        `${theme} で文字のコントラストが ${min.toFixed(2)}:1 になります（4.5:1 未満）。`,
      );
  for (const [theme, { text, ui }] of Object.entries(ageContrast(config, tokens))) {
    if (text < 4.5)
      problems.push(
        `${theme} の経年で文字のコントラストが ${text.toFixed(2)}:1 になります（4.5:1 未満）。`,
      );
    if (ui < 3)
      problems.push(
        `${theme} の経年でフォーカスのコントラストが ${ui.toFixed(2)}:1 になります（3:1 未満）。`,
      );
  }
  return problems;
}

const PREVIEWS = 'node_modules/.kei-wear-preview';

/** Bakes the given characters with the config's salt and outline; resolves to the faces written. */
function bakePreview(config, text) {
  const key = createHash('sha256')
    .update(JSON.stringify([config.salt, config.outline, text]))
    .digest('hex')
    .slice(0, 16);
  const dir = `${PREVIEWS}/${key}`;
  if (existsSync(`${dir}/faces.json`))
    return Promise.resolve({ key, ...JSON.parse(readFileSync(`${dir}/faces.json`, 'utf8')) });
  mkdirSync(dir, { recursive: true });
  const python = wearPython();
  return new Promise((resolve, reject) => {
    const child = spawn(python, ['scripts/wear/font.py', 'preview', dir], {
      env: { ...process.env, ...outlineEnv(config.outline) },
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => (out += chunk));
    child.stderr.on('data', (chunk) => (err = (err + chunk).slice(-2000)));
    // A missing python3 or module ends with the fix as the last line, which the page shows.
    child.on('error', () => reject(new Error(missingMessage(python))));
    child.on('close', (code) => {
      if (/ModuleNotFoundError/.test(err))
        return reject(new Error(`${err}\n${missingMessage(python)}`));
      if (code !== 0) return reject(new Error(err || `font.py exited with ${code}`));
      writeFileSync(`${dir}/faces.json`, out);
      resolve({ key, ...JSON.parse(out) });
    });
    child.stdin.end(JSON.stringify({ salt: config.salt, text }));
  });
}

export function wearTuneServer() {
  const font = { state: 'idle', log: '' };
  function buildFonts() {
    if (font.child) font.child.kill();
    font.state = 'running';
    font.log = '';
    const child = spawn(process.execPath, ['scripts/build-wear-font.mjs'], { env: process.env });
    font.child = child;
    const keep = (chunk) => (font.log = (font.log + chunk).slice(-2000));
    child.stdout.on('data', keep);
    child.stderr.on('data', keep);
    child.on('close', (code) => {
      if (font.child !== child) return;
      font.child = undefined;
      font.state = code === 0 ? 'done' : 'failed';
    });
  }
  return {
    name: 'kei-wear-tune',
    apply: 'serve',
    // The page already holds what it saved; reloading on the config write would drop its state.
    handleHotUpdate({ file }) {
      if (file.endsWith('/wear.config.json')) return [];
    },
    configureServer(server) {
      server.middlewares.use('/__kei-wear', (req, res) => {
        const send = (status, body) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(body));
        };
        if (!LOOPBACK.has(req.socket.remoteAddress)) return send(403, { error: 'local only' });
        const { state, log } = font;
        if (req.method === 'GET' && req.url === '/config') return send(200, readConfig());
        if (req.method === 'GET' && req.url === '/status') return send(200, { state, log });
        const file =
          req.method === 'GET' && req.url.match(/^\/preview\/([0-9a-f]{16})\/([\w.-]+\.woff2)$/);
        if (file) {
          const path = `${PREVIEWS}/${file[1]}/${file[2]}`;
          if (!existsSync(path)) return send(404, { error: 'not found' });
          res.setHeader('Content-Type', 'font/woff2');
          return res.end(readFileSync(path));
        }
        if (req.method !== 'POST' || !['/config', '/preview'].includes(req.url))
          return send(404, { error: 'not found' });
        // A page from another origin must not be able to post here.
        const origin = req.headers.origin;
        if (!origin || new URL(origin).host !== req.headers.host)
          return send(403, { error: 'same origin only' });
        let body = '';
        req.on('data', (chunk) => (body = (body + chunk).slice(0, 40000)));
        req.on('end', () => {
          let config, text;
          try {
            const parsed = JSON.parse(body);
            config = normaliseConfig(req.url === '/preview' ? parsed.config : parsed);
            text = String(parsed.text ?? '').slice(0, 2000);
          } catch {
            return send(400, { error: 'JSON を読めません。' });
          }
          if (req.url === '/preview') {
            const problems = validate(
              config,
              JSON.parse(readFileSync('tokens/tokens.json', 'utf8')),
            );
            if (problems.some((p) => p.startsWith('outline') || p.startsWith('ソルト')))
              return send(422, { problems });
            return bakePreview(config, text).then(
              (result) => send(200, result),
              (error) => send(500, { error: String(error.message ?? error) }),
            );
          }
          const tokens = JSON.parse(readFileSync('tokens/tokens.json', 'utf8'));
          const problems = validate(config, tokens);
          if (problems.length) return send(422, { problems });
          writeFileSync('wear.config.json', JSON.stringify(config, null, 2) + '\n');
          const meta = writeWear(config);
          buildFonts();
          send(200, { config, bytes: meta.bytes });
        });
      });
    },
  };
}
