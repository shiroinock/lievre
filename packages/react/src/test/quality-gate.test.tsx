// docs/quality-gate.md lists each layout check with its tolerance; CRITERIA in declare.ts is the
// one the checks use. A review once found the table rewritten to 0.8px for every check while only
// inset-y had changed, so the two are compared here.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CRITERIA } from './layout/declare';

const doc = readFileSync(join(import.meta.dirname, '../../../../docs/quality-gate.md'), 'utf8');

/** The tolerance each check measures against (checks.ts). */
const TOLERANCE: Record<string, string> = {
  'inset-x': `${CRITERIA.insetX}px`,
  'inset-y': `${CRITERIA.insetY}px`,
  '{ icon }': `${CRITERIA.icon}px`,
  'control-height': `${CRITERIA.size}px`,
  'grid-height': `${CRITERIA.size}px`,
  square: `${CRITERIA.size}px`,
  'focus-room': `${CRITERIA.size}px`,
  '{ padding }': `${CRITERIA.size}px`,
  'padding-equal': `${CRITERIA.size}px`,
  'action-band': `${CRITERIA.size}px`,
  '{ sameHeight }': `${CRITERIA.size}px`,
  fits: '0',
  'fills-x': `${CRITERIA.fill}px（線の太さ）`,
  '{ baseline }': `${CRITERIA.baseline}px`,
  'line-grid': `${CRITERIA.line}px`,
};

describe('docs/quality-gate.md', () => {
  const rows = new Map(
    [...doc.matchAll(/^\| `([^`]+)`[^|]*\|[^|]*\| ([^|]+?)\s*\|$/gm)].map(([, name, tol]) => [
      name,
      tol,
    ]),
  );
  for (const [name, tolerance] of Object.entries(TOLERANCE))
    it(`${name} の許容差が CRITERIA と同じ`, () => {
      expect(rows.get(name), `表に ${name} の行がないか、許容差が違います`).toBe(tolerance);
    });
  it('表のすべての検査を見ている', () => {
    expect([...rows.keys()].sort()).toEqual(Object.keys(TOLERANCE).sort());
  });
});
