import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Heading, Button, Card, Text } from '../index';
const meta = {
  title: 'Components/Content/Heading',
  component: Heading,
  args: { children: '情報を、わかりやすく。', level: 2, size: 'section' },
  parameters: {
    layoutGate: {
      parts: [{ name: '見出し', selector: '.lv-heading', checks: ['fits'] }],
    } satisfies LayoutGate,
  },
} satisfies Meta<typeof Heading>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Section: Story = {};
export const Title: Story = { args: { level: 1, size: 'title' } };
export const Display: Story = { args: { level: 1, size: 'display' } };
export const Minor: Story = { args: { level: 4, size: 'minor' } };
export const Subsection: Story = { args: { level: 3, size: 'subsection' } };
/** 5つの大きさ。段（level）は文書の構造で、大きさとは別に選びます。 */
export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      <Heading level={1} size="display">
        表示（display）
      </Heading>
      <Heading level={1} size="title">
        画面の見出し（title）
      </Heading>
      <Heading level={2} size="section">
        節の見出し（section）
      </Heading>
      <Heading level={3} size="subsection">
        小節の見出し（subsection）
      </Heading>
      <Heading level={4} size="minor">
        小見出し（minor）
      </Heading>
    </div>
  ),
};
