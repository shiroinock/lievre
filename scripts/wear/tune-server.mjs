// Dev-server endpoints for the wear tuning page (npm run wear:tune). Only `vite` serve loads this,
// and it answers only requests from this machine, so nothing in a build can write the config.
//   GET  /__kei-wear/config  the saved wear.config.json
//   POST /__kei-wear/config  save values, regenerate src/styles/wear/ and start the font build
//   GET  /__kei-wear/status  the font build's progress
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { normaliseConfig, TEXT_KINDS } from '../../src/wear/presets.mjs';
import { contrastGauge } from '../../src/wear/gauges.mjs';
import { readConfig, writeWear } from '../build-wear.mjs';

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const RANGES = {
  'distortion.amplitude': [0, 60],
  'distortion.wavelength': [40, 400],
  'kasure.density': [1, 16],
  'kasure.threshold': [0.3, 0.95],
  'kasure.floor': [0.5, 1],
  'stain.strength': [0, 0.2],
};

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
  for (const kind of Object.keys(TEXT_KINDS)) {
    const { distort, kasure } = config.kinds[kind];
    if (typeof distort !== 'boolean' || !(kasure >= 0 && kasure <= 1))
      problems.push(`kinds.${kind} の値が正しくありません。`);
  }
  for (const [theme, { min }] of Object.entries(contrastGauge(config, tokens)))
    if (min < 4.5)
      problems.push(
        `${theme} で文字のコントラストが ${min.toFixed(2)}:1 になります（4.5:1 未満）。`,
      );
  return problems;
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
        if (req.method !== 'POST' || req.url !== '/config')
          return send(404, { error: 'not found' });
        // A page from another origin must not be able to post here.
        const origin = req.headers.origin;
        if (!origin || new URL(origin).host !== req.headers.host)
          return send(403, { error: 'same origin only' });
        let body = '';
        req.on('data', (chunk) => (body = (body + chunk).slice(0, 20000)));
        req.on('end', () => {
          let config;
          try {
            config = normaliseConfig(JSON.parse(body));
          } catch {
            return send(400, { error: 'JSON を読めません。' });
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
