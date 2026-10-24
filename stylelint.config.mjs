// Only KEI's own guards: formatting is Prettier's job.
import kei, { layoutRules } from './scripts/stylelint-kei.mjs';
import { heightGridKnown } from './scripts/stylelint-baseline.mjs';

export default {
  plugins: [...kei, ...layoutRules],
  // A rule may be switched off for one line only with a reason: `-- 理由`.
  reportDescriptionlessDisables: true,
  rules: {
    'kei/utilities-no-size': true,
    'kei/mono-unicode-range': true,
    'kei/mono-weights': true,
    'kei/forced-colors-state': true,
    // The `font` shorthand resets line-height to `normal`, so always give it one.
    'declaration-property-value-allowed-list': [
      { font: ['inherit', '/\\//'] },
      {
        message:
          'font の一括指定には「/ 行の高さ」を書いてください（書かないと normal に戻ります）。',
      },
    ],
    // Layout gate (docs/quality-gate.md).
    'kei/padding-symmetry': true,
    'kei/height-grid': [true, { known: heightGridKnown }],
  },
};
