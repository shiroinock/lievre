// Only KEI's own guards: formatting is Prettier's job and types are tsc's.
import tseslint from 'typescript-eslint';
import kei from './lint/index.js';

export default tseslint.config(
  { ignores: ['lib', 'dist', 'node_modules', 'storybook-static'] },
  {
    files: ['src/**/*.tsx'],
    languageOptions: { parser: tseslint.parser },
    // The rules shipped to apps (lint/), run on the stories and screens that use KEI here.
    ...kei.configs.recommended,
    settings: { kei: { importSources: ['@kei-design/react', '../index'] } },
  },
);
