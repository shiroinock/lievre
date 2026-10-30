// Only lievre's own guards: formatting is Prettier's job and types are tsc's.
import tseslint from 'typescript-eslint';
import lievre from './lint/index.js';

export default tseslint.config(
  { ignores: ['lib', 'dist', 'node_modules', 'storybook-static'] },
  {
    files: ['src/**/*.tsx'],
    languageOptions: { parser: tseslint.parser },
    // The rules shipped to apps (lint/), run on the stories and screens that use lievre here.
    ...lievre.configs.recommended,
    settings: { lievre: { importSources: ['@lievre/react', '../index'] } },
  },
  {
    // The tests of the migration write the old names on purpose.
    files: ['src/test/consumer-lint.test.tsx', 'src/test/migrate.test.tsx'],
    rules: { 'lievre/no-legacy-prefix': 'off' },
  },
);
