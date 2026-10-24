import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import axe from 'axe-core';
import {
  KeiProvider,
  ToastProvider,
  Button,
  Checkbox,
  Switch,
  TextField,
  Select,
  Dialog,
  DataTable,
  Badge,
  Meter,
  Progress,
  Sparkline,
  type Column,
} from '../index';
import { OperationsExample, SettingsExample } from '../patterns/Operations';
import type { ReactNode } from 'react';
function setup(ui: ReactNode, theme: 'paper' | 'ink' = 'paper') {
  return render(
    <KeiProvider theme={theme}>
      <ToastProvider>{ui}</ToastProvider>
    </KeiProvider>,
  );
}

describe('Input and focus contracts', () => {
  it('prevents repeated actions while loading and retains its accessible name', async () => {
    const action = vi.fn();
    setup(
      <Button loading onClick={action}>
        保存する
      </Button>,
    );
    const button = screen.getByRole('button', { name: '保存する' });
    await userEvent.click(button);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(action).not.toHaveBeenCalled();
  });
  it('associates visible labels and errors with inputs', () => {
    setup(<TextField label="メールアドレス" error="形式を確認してください" required />);
    const field = screen.getByRole('textbox', { name: 'メールアドレス' });
    expect(field).toBeRequired();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('形式を確認してください');
  });
  it('supports switch with Space and exposes mixed checkbox state', async () => {
    setup(
      <>
        <Switch label="自動同期" />
        <Checkbox label="一部を選択中" checked="indeterminate" />
      </>,
    );
    const toggle = screen.getByRole('switch', { name: '自動同期' });
    toggle.focus();
    await userEvent.keyboard(' ');
    expect(toggle).toBeChecked();
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'mixed');
  });
  it('selects with the keyboard, closes with Escape and retains theme in the portal', async () => {
    setup(
      <Select
        label="モード"
        options={[
          { value: 'a', label: '標準' },
          { value: 'b', label: '省電力' },
        ]}
      />,
      'ink',
    );
    const trigger = screen.getByRole('combobox');
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    const list = await screen.findByRole('listbox');
    expect(list.closest('.kei')).toHaveAttribute('data-theme', 'ink');
    await userEvent.keyboard('{End}{Enter}');
    expect(trigger).toHaveTextContent('省電力');
    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it('carries prototype theme and wear into portals', async () => {
    render(
      <KeiProvider theme="rust" wear="baked">
        <Dialog trigger={<Button>開く</Button>} title="表示設定" description="表示を調整">
          <Button>保存</Button>
        </Dialog>
      </KeiProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: '開く' }));
    const scope = screen.getByRole('dialog', { name: '表示設定' }).closest('.kei');
    expect(scope).toHaveAttribute('data-theme', 'rust');
    expect(scope).toHaveAttribute('data-wear', 'baked');
  });
  it('traps dialog focus and restores it to the trigger on Escape', async () => {
    setup(
      <Dialog trigger={<Button>開く</Button>} title="表示設定" description="表示を調整">
        <TextField label="名称" />
        <Button>保存</Button>
      </Dialog>,
      'ink',
    );
    const trigger = screen.getByRole('button', { name: '開く' });
    await userEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: '表示設定' });
    expect(dialog.closest('.kei')).toHaveAttribute('data-theme', 'ink');
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await userEvent.keyboard('{Tab}{Tab}{Tab}{Tab}');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
describe('Tables and measures', () => {
  type Row = { id: string; value: number };
  const rows: Row[] = [
    { id: 'A', value: 42 },
    { id: 'B', value: 7 },
    { id: 'C', value: 100 },
  ];
  const columns: Column<Row>[] = [
    { key: 'id', header: 'ID', render: (r) => r.id },
    { key: 'value', header: '値', render: (r) => r.value, sortValue: (r) => r.value },
  ];
  it('sorts numbers numerically in both directions and marks the sorted heading', async () => {
    setup(<DataTable rows={rows} columns={columns} getRowId={(r) => r.id} caption="測定値" />);
    const sort = screen.getByRole('button', { name: '値' });
    await userEvent.click(sort);
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('B7');
    expect(sort.closest('th')).toHaveAttribute('aria-sort', 'ascending');
    await userEvent.click(sort);
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('C100');
    expect(sort.closest('th')).toHaveAttribute('aria-sort', 'descending');
  });
  it('selects visible rows while preserving selections on other pages', async () => {
    const change = vi.fn();
    setup(
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        caption="測定値"
        selectable
        selectedIds={['Z', 'A']}
        onSelectionChange={change}
      />,
    );
    const all = screen.getByRole('checkbox', { name: '表示中のすべてを選択' });
    expect(all).toBePartiallyChecked();
    await userEvent.click(all);
    expect(change).toHaveBeenCalledWith(['Z', 'A', 'B', 'C']);
  });
  it('clamps invalid measure values and exposes correct ranges', () => {
    setup(
      <>
        <Meter label="回転数" value={200} max={100} />
        <Progress label="同期" value={-20} />
      </>,
    );
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });
  it('stretches the sparkline to its box instead of letterboxing it', () => {
    setup(<Sparkline label="推移" values={[1, 3, 2]} />);
    expect(screen.getByRole('img', { name: '推移' })).toHaveAttribute(
      'preserveAspectRatio',
      'none',
    );
  });
  it('renders an informative empty table instead of a blank panel', () => {
    setup(<DataTable rows={[]} columns={columns} getRowId={(r) => r.id} caption="測定値" />);
    expect(screen.getByText('該当するデータがありません')).toBeVisible();
    expect(screen.getByRole('table')).toHaveAccessibleName('測定値');
  });
});
describe('Workspace flows', () => {
  it('filters, clears empty results and sorts all pages before pagination', async () => {
    setup(<OperationsExample />);
    const search = screen.getByRole('textbox', { name: '作業を検索' });
    await userEvent.type(search, '存在しない作業');
    expect(screen.getByText('該当するデータがありません')).toBeVisible();
    await userEvent.clear(search);
    await userEvent.click(screen.getByRole('button', { name: '優先度' }));
    expect(screen.getByText('エッジ端末の更新')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: '次のページ' }));
    expect(screen.getByText('アーカイブの整合性検証')).toBeVisible();
  });
  it('validates, creates, searches and opens the newly created record with its notes', async () => {
    setup(<OperationsExample compact />);
    await userEvent.click(screen.getByRole('button', { name: '作業を追加' }));
    const dialog = within(screen.getByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: '作業を追加' }));
    expect(dialog.getByText('作業名を入力してください。')).toBeVisible();
    await userEvent.type(dialog.getByRole('textbox', { name: '作業名' }), '新しい接続テスト');
    await userEvent.type(dialog.getByRole('textbox', { name: '作業メモ' }), '機材の電源を確認');
    await userEvent.click(dialog.getByRole('button', { name: '作業を追加' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: '作業を検索' }), '新しい接続テスト');
    const row = screen.getByRole('row', { name: /新しい接続テスト/ });
    await userEvent.click(within(row).getByRole('button', { name: /詳細を開く/ }));
    expect(within(screen.getByRole('dialog')).getByText('機材の電源を確認')).toBeVisible();
  });
  it('saves settings and reports completion', async () => {
    setup(<SettingsExample />);
    const name = screen.getByRole('textbox', { name: 'ワークスペース名' });
    await userEvent.clear(name);
    await userEvent.type(name, '新しいラボ');
    await userEvent.click(screen.getByRole('button', { name: '設定を保存' }));
    expect(screen.getByText('保存済み')).toBeVisible();
    expect(screen.getByText('設定を保存しました')).toBeVisible();
  });
});
describe('Automated accessibility', () => {
  for (const theme of ['paper', 'ink'] as const) {
    it(`checks controls, states and labels in ${theme}`, async () => {
      const { container } = setup(
        <main>
          <h1>アクセシビリティ検査</h1>
          <TextField label="名称" error="名前を入力してください" />
          <Select label="モード" options={[{ value: 'a', label: '標準' }]} />
          <Switch label="自動同期" />
          <Checkbox label="更新通知" />
          <Button variant="primary">保存</Button>
          <Badge tone="warning">要確認</Badge>
          <Meter label="使用率" value={42} />
        </main>,
        theme,
      );
      const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
      expect(
        results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html) })),
      ).toEqual([]);
    });
    it(`checks the composed workspace in ${theme}`, async () => {
      const { container } = setup(
        <main>
          <h1>ワークスペース</h1>
          <OperationsExample />
        </main>,
        theme,
      );
      const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
      expect(
        results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html) })),
      ).toEqual([]);
    });
  }
});
