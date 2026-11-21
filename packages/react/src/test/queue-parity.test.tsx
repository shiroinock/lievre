// @lievre/tui keeps its own copy of the queue rules (it does not depend on @lievre/react). The two
// must give the same answers: random runs of decide / defer / undo / re-decide go through both.
import { describe, expect, it } from 'vitest';
import * as web from '../components/queue';
import * as term from '../../../tui/src/core/queue';

const keys = ['a', 'b', 'c', 'd', 'e', 'f'];
// A small deterministic generator, so a failure can be replayed.
function random(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2 ** 31;
    return x / 2 ** 31;
  };
}

describe('the queue rules in @lievre/react and @lievre/tui', () => {
  for (let seed = 1; seed <= 40; seed++)
    it(`agree on run ${seed}`, () => {
      const next = random(seed);
      let a: web.DecisionState = web.emptyDecisionState;
      let b: term.DecisionState = term.emptyDecisionState;
      for (let step = 0; step < 30; step++) {
        const key = keys[Math.floor(next() * keys.length)];
        const kind = Math.floor(next() * 5);
        if (kind === 0 || kind === 1) {
          const value = kind === 0 ? 'in' : 'out';
          a = web.decideItem(a, key, value);
          b = term.decideItem(b, key, value);
        } else if (kind === 2) {
          a = web.deferItem(a, key);
          b = term.deferItem(b, key);
        } else if (kind === 3) {
          a = web.undoDecision(a);
          b = term.undoDecision(b);
        } else {
          a = web.decideItem(a, key, undefined);
          b = term.decideItem(b, key, undefined);
        }
        expect(b).toEqual(a);
        expect(term.getQueueSnapshot(keys, b)).toEqual(web.getQueueSnapshot(keys, a));
      }
    });
});
