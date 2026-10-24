import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { buildLlms } from '../../scripts/build-llms.mjs';

describe('llms.txt', () => {
  it('matches what the component types generate', () => {
    // Run `npm run llms` after changing a component's props or doc comment.
    expect(readFileSync('llms.txt', 'utf8')).toBe(buildLlms());
    // Building the TypeScript program takes a few seconds while the other test files run.
  }, 30_000);
});
