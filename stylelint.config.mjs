// Only KEI's own guards: formatting is Prettier's job.
import kei from './scripts/stylelint-kei.mjs';

export default {
  plugins: kei,
  // A rule may be switched off for one line, but only with a reason after `--`.
  reportDescriptionlessDisables: true,
  rules: {
    'kei/utilities-no-size': true,
    'kei/mono-unicode-range': true,
    'kei/mono-weights': true,
    'kei/forced-colors-state': true,
    'kei/spacing-grid': true,
    'kei/surface-tokens': true,
    // The `font` shorthand resets line-height to `normal`, so always give it one.
    'declaration-property-value-allowed-list': [
      { font: ['inherit', '/\\//'] },
      {
        message:
          'font の一括指定には「/ 行の高さ」を書いてください（書かないと normal に戻ります）。',
      },
    ],
  },
};
