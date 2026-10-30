// The sample screen: a card with a figure and two buttons, and a table of jobs.
import { Box, Text } from 'ink';
import { Button, Card, Lievre, Status, Table, type Column, type State } from './components.js';
import type { Glyphs } from '../core/glyphs.js';
import type { Palette } from '../core/palette.js';

type Job = { name: string; count: number; seconds: number; state: State };

const JOBS: Job[] = [
  { name: '請求書の取り込み', count: 4120, seconds: 1.82, state: 'ok' },
  { name: '入金の照合', count: 12480, seconds: 0.4, state: 'ok' },
  { name: '仕訳の書き出し', count: 860, seconds: 12.05, state: 'warn' },
  { name: '取引先の同期', count: 0, seconds: 0, state: 'stop' },
];

const number = new Intl.NumberFormat('ja-JP');
const seconds = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Figures are right-aligned with a fixed number of decimals, so digits line up by place.
const COLUMNS: Column<Job>[] = [
  { label: '処理', width: 16, cell: (j) => j.name },
  { label: '件数', width: 7, align: 'right', cell: (j) => number.format(j.count) },
  { label: '平均（秒）', width: 10, align: 'right', cell: (j) => seconds.format(j.seconds) },
  { label: '状態', width: 6, cell: (j) => <Status state={j.state} width={6} /> },
];

export type Focus = 'save' | 'cancel' | 'table';

export function Screen({
  p,
  g,
  focus,
  row,
  caption,
}: {
  p: Palette;
  g: Glyphs;
  focus: Focus;
  row: number;
  caption?: string;
}) {
  return (
    <Lievre.Provider value={{ p, g }}>
      <Box flexDirection="column" width={56} gap={1}>
        {/* Outside lievre's surfaces the text keeps the terminal's own colors. */}
        {caption && <Text bold>{caption}</Text>}
        <Card title="今月の処理">
          <Box flexDirection="column">
            <Text color={p.muted} backgroundColor={p.surface}>
              処理した件数
            </Text>
            <Text color={p.text} backgroundColor={p.surface}>
              <Text bold>17,460</Text> 件　前月より 4.2% 増
            </Text>
          </Box>
          <Box gap={1}>
            <Button label="保存する" variant="primary" focused={focus === 'save'} />
            <Button label="取り消す" focused={focus === 'cancel'} />
          </Box>
        </Card>
        <Card title="処理の一覧">
          <Table columns={COLUMNS} rows={JOBS} selected={focus === 'table' ? row : undefined} />
        </Card>
      </Box>
    </Lievre.Provider>
  );
}

export const ROWS = JOBS.length;
