// Which Python bakes the worn fonts: LIEVRE_WEAR_PYTHON, then the repo's .venv-wear (made by
// `pnpm run wear:setup`), then python3 on PATH.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const VENV = fileURLToPath(new URL('../../.venv-wear/', import.meta.url));

export function wearPython() {
  if (process.env.LIEVRE_WEAR_PYTHON) return process.env.LIEVRE_WEAR_PYTHON;
  const venv = `${VENV}bin/python3`;
  return existsSync(venv) ? venv : 'python3';
}

export const SETUP_HINT =
  'pnpm run wear:setup を実行してください（.venv-wear/ に fontTools と brotli を入れます）。';

// One line for the terminal and the tuning page when the modules (or Python itself) are missing.
export function missingMessage(python) {
  return `${python} に fontTools と brotli がありません。${SETUP_HINT}`;
}
