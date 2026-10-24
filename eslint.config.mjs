// Only KEI's own guards: formatting is Prettier's job and types are tsc's.
import tseslint from 'typescript-eslint';

const isMono = (element) =>
  element?.type === 'JSXElement' &&
  element.openingElement.attributes.some(
    (a) =>
      a.type === 'JSXAttribute' &&
      a.name.name === 'className' &&
      typeof a.value?.value === 'string' &&
      a.value.value.split(/\s+/).includes('k-mono'),
  );

const kei = {
  rules: {
    // Units are words, not data: `<span><span className="k-mono">{n}</span>%</span>`.
    'unit-outside-mono': {
      meta: {
        type: 'problem',
        messages: {
          unit: '単位（%）は .k-mono の外に出して本文の書体にしてください：<span><span className="k-mono">{n}</span>%</span>',
        },
      },
      create: (context) => ({
        JSXText(node) {
          if (node.value.includes('%') && isMono(node.parent))
            context.report({ node, messageId: 'unit' });
        },
      }),
    },
  },
};

export default tseslint.config(
  { ignores: ['lib', 'dist', 'node_modules', 'storybook-static'] },
  {
    files: ['src/**/*.tsx'],
    languageOptions: { parser: tseslint.parser },
    plugins: { kei },
    rules: { 'kei/unit-outside-mono': 'error' },
  },
);
