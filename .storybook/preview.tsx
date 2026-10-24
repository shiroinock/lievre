import type { Preview } from '@storybook/react-vite';
import { KeiProvider } from '../src/components/system';
import '../src/styles/kei.css';
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
          { value: 'paper', title: 'Paper / 白と青' },
          { value: 'ink', title: 'Ink / 深い青' },
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
          { value: 'standard', title: '標準 / 16px' },
          { value: 'interface', title: '操作画面 / 14px' },
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
  initialGlobals: { theme: 'paper', density: 'comfortable', typography: 'standard' },
  decorators: [
    (Story, context) => (
      <KeiProvider
        theme={context.globals.theme}
        density={context.globals.density}
        typography={context.globals.typography}
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
