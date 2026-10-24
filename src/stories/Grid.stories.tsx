import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Grid, Button, Card, Text } from '../index';
const meta = {
  title: 'Components/Layout/Grid',
  component: Grid,
  args: { minWidth: '14rem', gap: 6 },
  parameters: {
    layoutGate: {
      parts: [{ name: 'グリッド', selector: '.k-grid', checks: ['fits'] }],
    } satisfies LayoutGate,
  },
} satisfies Meta<typeof Grid>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Responsive: Story = {
  render: (args) => (
    <Grid {...args}>
      {['読む', '探す', '申し込む'].map((t) => (
        <Card key={t} title={t}>
          <Text>幅に合わせて列数が変わります。</Text>
        </Card>
      ))}
    </Grid>
  ),
};
