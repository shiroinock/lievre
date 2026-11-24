// `pnpm run wear:setup`: makes .venv-wear/ in the repo and installs the pinned modules from
// scripts/wear/requirements.txt, with uv when it is on PATH and python3 -m venv + pip otherwise.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { VENV } from './python.mjs';

const requirements = fileURLToPath(new URL('requirements.txt', import.meta.url));
const python = `${VENV}bin/python3`;
const run = (command, args) => execFileSync(command, args, { stdio: 'inherit' });
const has = (command) => {
  try {
    execFileSync(command, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

if (has('uv')) {
  run('uv', ['venv', '--allow-existing', VENV]);
  run('uv', ['pip', 'install', '--python', python, '-r', requirements]);
} else if (has('python3')) {
  run('python3', ['-m', 'venv', VENV]);
  run(python, ['-m', 'pip', 'install', '--disable-pip-version-check', '-r', requirements]);
} else {
  console.error(
    'uv も python3 も見つかりません。Python 3 を入れてから、もう一度実行してください。',
  );
  process.exit(1);
}
run(python, ['-c', 'import fontTools, brotli; print("fontTools", fontTools.version)']);
console.log(`用意しました：${python}`);
