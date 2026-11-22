import { describe, it, expect } from 'vitest';

// 試し：CI の直しの workflow が動くかを見るための PR。マージしない。
const widths = { narrow: 4, wide: 8 };

describe('Try fix CI', () => {
  it('doubles the narrow width', () => {
    const double: number = widths.narrow * 2;
    expect(double).toBe(widths.wide);
  });
});
