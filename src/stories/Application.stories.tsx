import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import App from '../App';
const meta = {
  title: 'Patterns/Application',
  component: App,
  parameters: {
    layoutGate: {
      skip: '画面例。中の部品は、それぞれの部品の Story で測っている。',
    } satisfies LayoutGate,
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'ナビゲーションを含む全体像。左下のPaper / Inkと表示密度、各ページへの移動を試せます。このStoryはアプリ内の配色設定を使います。',
      },
    },
  },
} satisfies Meta<typeof App>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Workbench: Story = { name: 'デザインシステム全体' };
