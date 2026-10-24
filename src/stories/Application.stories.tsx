import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { SCREEN_PARTS } from '../test/layout/screen-parts';
import App from '../App';
const meta = {
  title: 'Patterns/Application',
  component: App,
  parameters: {
    layoutGate: {
      screen: '部品を組み合わせた画面。操作の要素の網羅は、それぞれの部品の Story で見る。',
      parts: SCREEN_PARTS,
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
