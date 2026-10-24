import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  KeiProvider,
  Badge,
  Button,
  Divider,
  Heading,
  Meter,
  Metric,
  Text,
  TextField,
  type Theme,
  type Wear,
} from '../index';

const meta = {
  title: 'Foundations/試作 配色と擦れ',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '採用前の試作です。Sepia（焼けた紙）と Rust（錆びた筐体）の2テーマと、紙の粒・刷りのずれ・擦れた罫線を加える `wear="worn"` を、既存の Paper / Ink と並べて比べます。候補の一覧と根拠は references/weathered-candidates.md にあります。',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const themes: { theme: Theme; name: string; note: string }[] = [
  { theme: 'paper', name: 'Paper', note: '青みのある明るい紙（現行）' },
  { theme: 'ink', name: 'Ink', note: '深い紺（現行）' },
  { theme: 'sepia', name: 'Sepia', note: '焼けた紙と褪せた群青（試作）' },
  { theme: 'rust', name: 'Rust', note: '錆びた筐体と淡い群青（試作）' },
];

function Sample({ name, note }: { name: string; note: string }) {
  return (
    <div className="gallery-stack">
      <div>
        <Heading level={3} size="display">
          {name}
        </Heading>
        <Text size="small" tone="muted">
          {note}
        </Text>
      </div>
      <Metric
        label="同期の成功率"
        value="98.4"
        unit="%"
        change="前週より 1.2 ポイント上昇"
        trend="up"
        values={[91, 93, 92, 95, 94, 97, 98]}
        code="SYN-07"
      />
      <Meter value={62} label="筐体の温度" unit="℃" max={100} />
      <Divider label="操作" />
      <TextField label="ワークスペース名" defaultValue="計測ラボ" />
      <div className="button-row">
        <Button variant="primary">保存する</Button>
        <Button variant="secondary">取り消す</Button>
      </div>
      <div className="button-row">
        <Badge tone="success" dot>
          稼働中
        </Badge>
        <Badge tone="warning" dot>
          点検待ち
        </Badge>
        <Badge tone="danger" dot>
          停止
        </Badge>
        <Badge tone="info">記録</Badge>
      </div>
    </div>
  );
}

function Grid({ wear }: { wear: Wear }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))',
        gap: 16,
      }}
    >
      {themes.map((t) => (
        <KeiProvider key={t.theme} theme={t.theme} wear={wear} style={{ padding: 24 }}>
          <Sample name={t.name} note={t.note} />
        </KeiProvider>
      ))}
    </div>
  );
}

export const Themes: Story = {
  name: '4つのテーマ（整った面）',
  render: () => <Grid wear="clean" />,
};
export const Worn: Story = { name: '4つのテーマ（擦れ）', render: () => <Grid wear="worn" /> };
export const SideBySide: Story = {
  name: '整った面と擦れの対比',
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))',
        gap: 16,
      }}
    >
      {(['sepia', 'rust'] as const).flatMap((theme) =>
        (['clean', 'worn'] as const).map((wear) => (
          <KeiProvider key={theme + wear} theme={theme} wear={wear} style={{ padding: 24 }}>
            <Sample
              name={theme === 'sepia' ? 'Sepia' : 'Rust'}
              note={wear === 'clean' ? '整った面' : '擦れ：粒・刷りのずれ・罫線の欠け'}
            />
          </KeiProvider>
        )),
      )}
    </div>
  ),
};
