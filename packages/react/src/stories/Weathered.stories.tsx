import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import {
  LievreProvider,
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
    layoutGate: {
      skip: '質感の試作をテーマごとに並べる見本。部品はそれぞれの Story で測っている。',
    } satisfies LayoutGate,
    layout: 'padded',
    docs: {
      description: {
        component:
          '採用前の試作です。質感の3段階 `wear="off | baked | live"` を、Paper / Ink で比べます（試作した Sepia と Rust のテーマは採用しませんでした）。baked はビルド時のソルト（`npm run wear`、文字の歪みは `npm run wear:font`）で模様が決まり、live は `wearSeed` から実行時に SVG フィルタで描きます。候補の一覧と根拠は references/weathered-candidates.md にあります。',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const themes: { theme: Theme; name: string; note: string }[] = [
  { theme: 'paper', name: 'Paper', note: '青みのある明るい紙（現行）' },
  { theme: 'ink', name: 'Ink', note: '深い紺（現行）' },
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
      <Text>
        計測ラボの同期は 12 分 34 秒で終わりました。鬱蒼とした棚の奥の機材も、記録は揃っています。
      </Text>
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

function Grid({ wear, wearSeed }: { wear: Wear; wearSeed?: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))',
        gap: 16,
      }}
    >
      {themes.map((t) => (
        <LievreProvider
          key={t.theme}
          theme={t.theme}
          wear={wear}
          wearSeed={wearSeed}
          style={{ padding: 24 }}
        >
          <Sample name={t.name} note={t.note} />
        </LievreProvider>
      ))}
    </div>
  );
}

const levels: { wear: Wear; note: string }[] = [
  { wear: 'off', note: 'off：質感なし' },
  { wear: 'baked', note: 'baked：ビルド時に焼いた模様と字形' },
  { wear: 'live', note: 'live：実行時の SVG フィルタ' },
];

export const Themes: Story = { name: 'テーマ（質感なし）', render: () => <Grid wear="off" /> };
export const Baked: Story = { name: 'テーマ（baked）', render: () => <Grid wear="baked" /> };
export const Live: Story = { name: 'テーマ（live）', render: () => <Grid wear="live" /> };
export const Levels: Story = {
  name: '3段階の対比',
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))',
        gap: 16,
      }}
    >
      {(['paper', 'ink'] as const).flatMap((theme) =>
        levels.map(({ wear, note }) => (
          <LievreProvider key={theme + wear} theme={theme} wear={wear} style={{ padding: 24 }}>
            <Sample name={theme === 'paper' ? 'Paper' : 'Ink'} note={note} />
          </LievreProvider>
        )),
      )}
    </div>
  ),
};
export const Seeds: Story = {
  name: 'ソルトの違い（live）',
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))',
        gap: 16,
      }}
    >
      {['lievre', 'ash', 'rust-07'].map((seed) => (
        <LievreProvider
          key={seed}
          theme="paper"
          wear="live"
          wearSeed={seed}
          style={{ padding: 24 }}
        >
          <Sample name={seed} note={`wearSeed="${seed}"`} />
        </LievreProvider>
      ))}
    </div>
  ),
};
export const Reading: Story = {
  name: '本文の読みやすさ（14px と 16px）',
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      {levels.map(({ wear, note }) =>
        (['standard', 'interface'] as const).map((typography) => (
          <LievreProvider
            key={wear + typography}
            theme="paper"
            wear={wear}
            typography={typography}
            style={{ padding: 16 }}
          >
            <Text size="small" tone="muted">
              {note}・{typography === 'standard' ? '16px' : '14px'}
            </Text>
            <Text>
              lievre
              は、日本語の業務画面を読みやすく組み立てるためのデザインシステムです。読み物・検索・申し込み・管理画面を、同じトークンと部品から作ります。鬱蒼、薔薇、魑魅魍魎のような画数の多い字と、ID
              lievre-024、時刻 09:45、0.5% のような英数字を並べて確かめます。
            </Text>
          </LievreProvider>
        )),
      )}
    </div>
  ),
};
