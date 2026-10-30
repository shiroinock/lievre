// tokens.json is written from tokens.css; run `npm run tokens` after editing tokens.css.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildTokens } from '../scripts/build-tokens.mjs';

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('tokens.json is identical to what tokens.css generates', () => {
  // Every scope, both directions.
  assert.deepEqual(JSON.parse(read('tokens.json')), buildTokens(read('tokens.css')));
});

test('every scope has tokens', () => {
  const tokens = buildTokens(read('tokens.css'));
  for (const scope of ['paper', 'ink', 'compact', 'interface'])
    assert.ok(Object.keys(tokens[scope]).length > 0, scope);
});
