// Easing curves as CSS writes them, so the terminal can take the same --lv-ease as the web.

/** `cubic-bezier(x1, y1, x2, y2)` の4つの値。 */
export type Bezier = readonly [x1: number, y1: number, x2: number, y2: number];

/** CSS の `cubic-bezier(…)` を読む。x は 0〜1 でなければならない（CSS と同じ）。 */
export function parseCubicBezier(value: string): Bezier {
  const m = /^cubic-bezier\(([^)]*)\)$/.exec(value.trim());
  const n = m?.[1].split(',').map((s) => Number(s.trim()));
  if (!n || n.length !== 4 || n.some((v) => !Number.isFinite(v)))
    throw new Error(`cubic-bezier(x1, y1, x2, y2) の形で渡してください: ${value}`);
  if (n[0] < 0 || n[0] > 1 || n[2] < 0 || n[2] > 1)
    throw new Error(`cubic-bezier の x1 と x2 は 0〜1 にしてください: ${value}`);
  return n as unknown as Bezier;
}

/** 進み具合（0〜1）を、曲線に沿った値（0〜1）にする関数を返す。 */
export function cubicBezier([x1, y1, x2, y2]: Bezier): (t: number) => number {
  const at = (a: number, b: number, s: number) =>
    3 * a * (1 - s) ** 2 * s + 3 * b * (1 - s) * s ** 2 + s ** 3;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    // x(s) only grows while x1 and x2 stay in 0–1, so halving finds the s whose x is t.
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 32; i++) {
      const mid = (lo + hi) / 2;
      if (at(x1, x2, mid) < t) lo = mid;
      else hi = mid;
    }
    return at(y1, y2, (lo + hi) / 2);
  };
}
