import type { Preview } from '@storybook/react-vite';
import { KeiProvider } from '../src/components/system';
import '../src/styles/fonts.css';
import '../src/styles/kei.css';
import '../src/styles/kei-wear.css';
// Worn glyphs exist only after `npm run wear:font`; without them baked keeps the plain faces.
import.meta.glob('../wear-fonts/fonts.css', { eager: true });
import '../src/styles/demo.css';
const preview: Preview = {
  tags: ['autodocs'],
  globalTypes: {
    theme: {
      description: '配色',
      toolbar: {
        title: '配色',
        icon: 'paintbrush',
        items: [
          { value: 'paper', title: 'Paper（明るい面）' },
          { value: 'ink', title: 'Ink（深い紺の面）' },
        ],
        dynamicTitle: true,
      },
    },
    wear: {
      description: '質感（試作）',
      toolbar: {
        title: '質感',
        icon: 'contrast',
        items: [
          { value: 'off', title: '質感なし' },
          { value: 'baked', title: '焼き込み（試作・軽い）' },
          { value: 'live', title: '実行時（試作・重い）' },
        ],
        dynamicTitle: true,
      },
    },
    wearSeed: {
      description: '質感のソルト（live だけに効きます）',
      toolbar: {
        title: 'ソルト',
        icon: 'transfer',
        items: [
          { value: 'kei', title: 'kei' },
          { value: 'ash', title: 'ash' },
          { value: 'rust-07', title: 'rust-07' },
        ],
        dynamicTitle: true,
      },
    },
    age: {
      description: '経年（試作）',
      toolbar: {
        title: '経年',
        icon: 'time',
        items: [
          { value: 'none', title: '経年なし' },
          { value: 'light', title: '経年・弱（試作）' },
          { value: 'heavy', title: '経年・強（試作）' },
        ],
        dynamicTitle: true,
      },
    },
    typography: {
      description: '本文の用途',
      toolbar: {
        title: '本文',
        icon: 'paragraph',
        items: [
          { value: 'standard', title: '標準 16px' },
          { value: 'interface', title: '操作画面 14px' },
        ],
        dynamicTitle: true,
      },
    },
    density: {
      description: '表示密度',
      toolbar: {
        title: '表示密度',
        icon: 'component',
        items: [
          { value: 'comfortable', title: '標準' },
          { value: 'compact', title: '高密度' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'paper',
    density: 'comfortable',
    typography: 'standard',
    wear: 'off',
    wearSeed: 'kei',
    age: 'none',
  },
  decorators: [
    (Story, context) => (
      <KeiProvider
        theme={context.globals.theme}
        density={context.globals.density}
        typography={context.globals.typography}
        wear={context.globals.wear}
        wearSeed={context.globals.wearSeed}
        age={context.globals.age}
        className={context.parameters.layout === 'fullscreen' ? 'kei-story-full' : 'kei-story'}
      >
        <Story />
      </KeiProvider>
    ),
  ],
  parameters: {
    layout: 'padded',
    controls: { expanded: true, matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: { test: 'error' },
    docs: { codePanel: true },
    options: { storySort: { order: ['はじめに', 'Foundations', 'Components', 'Patterns'] } },
  },
};
export default preview;
