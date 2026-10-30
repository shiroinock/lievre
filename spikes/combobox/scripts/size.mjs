// lievre のライブラリに各 Combobox を足したときの、gzip 後の増分を測る。
// react・react-dom は lievre と同じく外に出す（radix-ui などは lievre の lib に入るので、重なる分は差し引かれる）。
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import optimizeLocales from '@react-aria/optimize-locales-plugin';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../size/', import.meta.url));
const repo = fileURLToPath(new URL('../../../', import.meta.url));
// radix-ui の中身と同じパッケージは、リポジトリ直下の1つにまとめる（実際の lib と同じ重なり方にする）。
const dedupe = [
  '@floating-ui/react-dom',
  '@floating-ui/dom',
  '@floating-ui/core',
  '@floating-ui/utils',
  'aria-hidden',
  'tslib',
  'use-sync-external-store',
  'radix-ui',
  'lucide-react',
];
const entries = readdirSync(dir)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => f.replace('.ts', ''))
  .sort((a, b) => (a === 'base' ? -1 : b === 'base' ? 1 : a.localeCompare(b)));
const sizes = {};
const runs = [
  ...entries.map((name) => [name, name, false]),
  ['raw-aria', 'raw-aria（ja-JP だけ）', true],
  ['aria-both', 'aria-both（ja-JP だけ）', true],
];
for (const [name, label, jaOnly] of runs) {
  const out = await build({
    configFile: false,
    root: repo,
    resolve: { dedupe },
    // 利用する側のアプリの本番ビルドと同じく、開発用の警告や prop-types を落とす。
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'silent',
    // jaOnly：React Aria の公式のプラグインで、同梱の文言を日本語だけにする。
    plugins: [react(), ...(jaOnly ? [optimizeLocales.vite({ locales: ['ja-JP'] })] : [])],
    build: {
      write: false,
      minify: 'esbuild',
      lib: { entry: `${dir}${name}.ts`, formats: ['es'], fileName: name },
      rollupOptions: { external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'] },
    },
  });
  const js = [out]
    .flat()[0]
    .output.filter((o) => o.type === 'chunk')
    .map((o) => o.code)
    .join('\n');
  sizes[label] = {
    min: js.length,
    gzip: gzipSync(js, { level: 9 }).length,
    brotli: brotliCompressSync(js).length,
  };
}
const base = sizes.base;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log('| 入口 | min | gzip | gzip の増分 | brotli の増分 |');
console.log('| --- | --: | --: | --: | --: |');
for (const [name, s] of Object.entries(sizes))
  console.log(
    `| ${name} | ${kb(s.min)} | ${kb(s.gzip)} | ${name === 'base' ? '—' : `+${kb(s.gzip - base.gzip)}`} | ${name === 'base' ? '—' : `+${kb(s.brotli - base.brotli)}`} |`,
  );
