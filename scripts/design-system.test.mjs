// The Design System artifact's generator (scripts/design-system) keeps up with the code: every
// component export has a card or a reason, and every token has a usage note.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ROOT, cards, inventoryProblems } from './design-system/inventory.mjs';
import { USAGE } from './design-system/token-usage.mjs';

test('部品の export と見本集の目録が揃っている', () => {
  assert.deepEqual(inventoryProblems(), []);
  assert.ok(cards().length > 0);
});

test('トークンに見本集の使いどころが書いてある', () => {
  const tokens = JSON.parse(readFileSync(`${ROOT}/packages/tokens/tokens.json`, 'utf8'));
  const names = Object.keys(tokens.paper);
  const missing = names.filter((n) => !USAGE[n]);
  const stale = Object.keys(USAGE).filter((n) => !names.includes(n));
  assert.deepEqual(
    missing,
    [],
    `--lv-${missing.join('・--lv-')} の使いどころがありません。scripts/design-system/token-usage.mjs に足してください。`,
  );
  assert.deepEqual(
    stale,
    [],
    `${stale.join('・')} は tokens.css にありません。scripts/design-system/token-usage.mjs から消してください。`,
  );
});
