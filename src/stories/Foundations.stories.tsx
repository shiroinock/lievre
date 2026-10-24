import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { KeiProvider, Button, TextField, Badge, Card, DataTable } from '../index';
import {
  ColorFoundation,
  TypeFoundation,
  SpaceFoundation,
  PrincipleFoundation,
  ReferenceDirection,
} from '../docs/Foundations';
const meta = {
  title: 'Foundations/Design language',
  parameters: {
    layoutGate: {
      skip: '配色・文字・密度を比べる見本。部品はそれぞれの Story で測っている。',
    } satisfies LayoutGate,
    layout: 'padded',
    docs: {
      description: {
        component:
          '全81件の参考を、計器・構造・組版・素材の4つの軸へ翻訳。上部の配色・表示密度ツールバーで切り替えて比較できます。',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Principles: Story = { name: '設計原則', render: () => <PrincipleFoundation /> };
export const Color: Story = { name: '配色', render: () => <ColorFoundation /> };
export const Typography: Story = { name: '文字', render: () => <TypeFoundation /> };
export const Spacing: Story = { name: '余白と形', render: () => <SpaceFoundation /> };
export const References: Story = { name: '参考の翻訳', render: () => <ReferenceDirection /> };
export const ThemeComparison: Story = {
  name: 'Paper と Ink',
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
        gap: 16,
      }}
    >
      {(['paper', 'ink'] as const).map((theme) => (
        <KeiProvider key={theme} theme={theme} style={{ padding: 24, borderRadius: 8 }}>
          <div className="gallery-stack">
            <span className="k-eyebrow">
              {theme === 'paper' ? 'Paper（明るい面）' : 'Ink（暗い面）'}
            </span>
            <TextField label="ワークスペース名" defaultValue="計測ラボ" />
            <div className="button-row">
              <Button variant="primary">保存する</Button>
              <Badge tone="success" dot>
                稼働中
              </Badge>
            </div>
          </div>
        </KeiProvider>
      ))}
    </div>
  ),
};

export const DensityComparison: Story = {
  name: '読みやすさと密度',
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))',
        gap: 24,
      }}
    >
      {(['comfortable', 'compact'] as const).map((density) => (
        <KeiProvider key={density} density={density} className="density-comparison">
          <Card title={density === 'comfortable' ? '標準' : '高密度'} eyebrow="本文16px・補助12px">
            <div className="gallery-stack">
              <TextField
                label="ワークスペース名"
                defaultValue="計測ラボ"
                hint="密度を変えても文字サイズは保ちます。"
              />
              <DataTable
                caption="表示密度の比較"
                getRowId={(r) => r.id}
                rows={[
                  { id: 'KEI-024', name: 'センサーログの同期' },
                  { id: 'KEI-023', name: '週次レポートの生成' },
                ]}
                columns={[
                  {
                    key: 'name',
                    header: '作業名',
                    render: (r) => (
                      <div className="work-name">
                        <span>{r.name}</span>
                        <small>{r.id}</small>
                      </div>
                    ),
                  },
                ]}
              />
              <Button variant="primary">変更を保存する</Button>
            </div>
          </Card>
        </KeiProvider>
      ))}
    </div>
  ),
};
