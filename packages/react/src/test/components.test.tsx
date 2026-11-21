import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import axe from 'axe-core';
import {
  LievreProvider,
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
  IconButton,
  DescriptionList,
  Spinner,
  VisuallyHidden,
  Alert,
  useToast,
  Field,
  Fieldset,
  CheckboxGroup,
  ErrorSummary,
  RadioGroup,
  type Column,
  type ToastMessage,
} from '../index';
import { OperationsExample, SettingsExample } from '../patterns/Operations';
import { StrictMode, type ReactNode } from 'react';
const wrap = (ui: ReactNode, theme: 'paper' | 'ink' = 'paper') => (
  <LievreProvider theme={theme}>
    <ToastProvider>{ui}</ToastProvider>
  </LievreProvider>
);
function setup(ui: ReactNode, theme: 'paper' | 'ink' = 'paper') {
  return render(wrap(ui, theme));
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
    expect(list.closest('.lievre')).toHaveAttribute('data-theme', 'ink');
    await userEvent.keyboard('{End}{Enter}');
    expect(trigger).toHaveTextContent('省電力');
    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it('carries prototype theme and wear into portals', async () => {
    render(
      <LievreProvider theme="ink" wear="baked">
        <Dialog trigger={<Button>開く</Button>} title="表示設定" description="表示を調整">
          <Button>保存</Button>
        </Dialog>
      </LievreProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: '開く' }));
    const scope = screen.getByRole('dialog', { name: '表示設定' }).closest('.lievre');
    expect(scope).toHaveAttribute('data-theme', 'ink');
    expect(scope).toHaveAttribute('data-wear', 'baked');
  });
  it('names an icon-only button by its label, shows the same words as a tooltip and keeps focus while loading', async () => {
    const { rerender } = setup(<IconButton label="行の操作" icon={<svg data-testid="icon" />} />);
    const button = screen.getByRole('button', { name: '行の操作' });
    expect(button).toHaveAttribute('type', 'button');
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
    await userEvent.tab();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('行の操作');
    rerender(
      <LievreProvider>
        <ToastProvider>
          <IconButton label="行の操作" icon={<svg />} loading />
        </ToastProvider>
      </LievreProvider>,
    );
    expect(screen.getByRole('button', { name: '行の操作' })).toBe(button);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
  it('announces a spinner by its label and adds hidden words to a button name', () => {
    setup(
      <>
        <Spinner label="一覧を読み込み中" />
        <Button>
          詳細<VisuallyHidden>（W-1024）</VisuallyHidden>
        </Button>
      </>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('一覧を読み込み中');
    expect(screen.getByText('一覧を読み込み中')).toHaveClass('lv-sr-only');
    expect(screen.getByRole('button')).toHaveAccessibleName(/詳細\s*（W-1024）/);
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
    expect(dialog.closest('.lievre')).toHaveAttribute('data-theme', 'ink');
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
  it('keeps a description list as dl, dt and dd, and sets figures in the monospaced face', async () => {
    const { container } = setup(
      <DescriptionList
        items={[
          { label: '申請番号', value: 'REQ-00481', mono: true },
          { label: '申請者', value: '計 花子' },
        ]}
      />,
    );
    const list = container.querySelector('dl')!;
    expect([...list.children].map((row) => [...row.children].map((c) => c.tagName))).toEqual([
      ['DT', 'DD'],
      ['DT', 'DD'],
    ]);
    expect(screen.getByText('REQ-00481')).toHaveClass('lv-mono');
    expect(screen.getByText('計 花子')).not.toHaveClass('lv-mono');
    const results = await axe.run(container);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
  const many = [30, 80, 10, 50, 95, 20, 60].map((value, i) => ({ id: `R${i + 1}`, value }));
  it('sorts every row before cutting the page, and goes back to page 1 when the order changes', async () => {
    const pageChange = vi.fn();
    setup(
      <DataTable
        rows={many}
        columns={columns}
        getRowId={(r) => r.id}
        caption="測定値"
        pageSize={3}
        onPageChange={pageChange}
      />,
    );
    expect(screen.getByText('7件中 1〜3件目')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: '次のページ' }));
    expect(pageChange).toHaveBeenLastCalledWith(2);
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('R450');
    await userEvent.click(screen.getByRole('button', { name: '値' }));
    expect(pageChange).toHaveBeenLastCalledWith(1);
    // The smallest of all seven, not of the three that were on page 2.
    expect(screen.getAllByRole('row').map((r) => r.textContent)).toEqual([
      'ID値',
      'R310',
      'R620',
      'R130',
    ]);
    await userEvent.click(screen.getByRole('button', { name: '次のページ' }));
    await userEvent.click(screen.getByRole('button', { name: '次のページ' }));
    expect(screen.getAllByRole('row').map((r) => r.textContent)).toEqual(['ID値', 'R595']);
    expect(screen.getByText('7件中 7〜7件目')).toBeVisible();
  });
  it('moves a page past the end to the last page and reports it once', () => {
    const change = vi.fn();
    const table = (count: number) => (
      <StrictMode>
        <DataTable
          rows={many.slice(0, count)}
          columns={columns}
          getRowId={(r) => r.id}
          caption="測定値"
          pageSize={3}
          page={3}
          onPageChange={change}
        />
      </StrictMode>
    );
    const { rerender } = setup(table(7));
    expect(change).not.toHaveBeenCalled();
    rerender(wrap(table(2)));
    expect(screen.getByRole('status')).toHaveTextContent('1ページ中 1ページ目');
    expect(screen.getAllByRole('row')).toHaveLength(3);
    // The app keeps page 3 here; the table does not ask again with the same page.
    rerender(wrap(table(2)));
    rerender(wrap(table(1)));
    expect(change.mock.calls).toEqual([[1]]);
    rerender(wrap(table(0)));
    expect(change.mock.calls).toEqual([[1]]);
  });
  it('keeps the page it moved to when the rows come back', async () => {
    const change = vi.fn();
    const table = (count: number) => (
      <DataTable
        rows={many.slice(0, count)}
        columns={columns}
        getRowId={(r) => r.id}
        caption="測定値"
        pageSize={3}
        onPageChange={change}
      />
    );
    const { rerender } = setup(table(7));
    await userEvent.click(screen.getByRole('button', { name: '次のページ' }));
    await userEvent.click(screen.getByRole('button', { name: '次のページ' }));
    expect(screen.getByRole('status')).toHaveTextContent('3ページ中 3ページ目');
    rerender(wrap(table(4)));
    expect(screen.getByRole('status')).toHaveTextContent('2ページ中 2ページ目');
    expect(change).toHaveBeenLastCalledWith(2);
    rerender(wrap(table(7)));
    expect(screen.getByRole('status')).toHaveTextContent('3ページ中 2ページ目');
    expect(change.mock.calls).toEqual([[2], [3], [2]]);
  });
  it('waits for the server to finish loading before moving a page past the end', () => {
    const change = vi.fn();
    const table = (loading: boolean, totalCount: number) => (
      <DataTable
        dataMode="server"
        rows={[]}
        columns={columns}
        getRowId={(r) => r.id}
        caption="測定値"
        loading={loading}
        sorting={null}
        onSortingChange={() => {}}
        pageSize={5}
        page={5}
        onPageChange={change}
        totalCount={totalCount}
      />
    );
    // While page 5 is loading, the total is still the one from before.
    const { rerender } = setup(table(true, 12));
    expect(change).not.toHaveBeenCalled();
    rerender(wrap(table(false, 12)));
    expect(change.mock.calls).toEqual([[3]]);
    rerender(wrap(table(false, 12)));
    expect(change.mock.calls).toEqual([[3]]);
  });
  it('leaves sorting and paging to the server in server mode', async () => {
    const sortChange = vi.fn();
    const pageChange = vi.fn();
    // A page the server already sorted by value, descending: the table must not reorder it.
    const pageRows = [
      { id: 'X', value: 5 },
      { id: 'Y', value: 9 },
    ];
    setup(
      <DataTable
        dataMode="server"
        rows={pageRows}
        columns={columns}
        getRowId={(r) => r.id}
        caption="測定値"
        sorting={{ key: 'value', direction: 'asc' }}
        onSortingChange={sortChange}
        pageSize={2}
        page={4}
        onPageChange={pageChange}
        totalCount={41}
      />,
    );
    expect(screen.getAllByRole('row').map((r) => r.textContent)).toEqual(['ID値', 'X5', 'Y9']);
    expect(screen.getByText('41件中 7〜8件目')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('21ページ中 4ページ目');
    await userEvent.click(screen.getByRole('button', { name: '値' }));
    expect(sortChange).toHaveBeenCalledWith({ key: 'value', direction: 'desc' });
    expect(pageChange).toHaveBeenCalledWith(1);
    expect(screen.getAllByRole('row').map((r) => r.textContent)).toEqual(['ID値', 'X5', 'Y9']);
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
          <Badge tone="danger" emphasis="strong" size="sm">
            停止
          </Badge>
          <Alert
            tone="info"
            title="お知らせ"
            action={<Button size="sm">詳細</Button>}
            onDismiss={() => {}}
          >
            本文
          </Alert>
          <Progress label="書き出し" />
          <Progress label="同期" value={30} tone="danger" />
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

describe('Feedback variations', () => {
  it('places alert actions and a named dismiss button that calls back', async () => {
    const dismiss = vi.fn();
    setup(
      <Alert
        tone="warning"
        title="読み込めませんでした"
        action={<Button size="sm">再読み込み</Button>}
        dismissLabel="読み込みのお知らせを閉じる"
        onDismiss={dismiss}
      >
        3件の行が古い形式です。
      </Alert>,
    );
    const alert = screen.getByRole('status');
    expect(within(alert).getByRole('button', { name: '再読み込み' })).toBeVisible();
    await userEvent.click(
      within(alert).getByRole('button', { name: '読み込みのお知らせを閉じる' }),
    );
    expect(dismiss).toHaveBeenCalledOnce();
  });
  it('draws no dismiss button unless asked', () => {
    setup(<Alert title="お知らせ">本文</Alert>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  function ToastButton(message: ToastMessage) {
    const toast = useToast();
    return <Button onClick={() => toast(message)}>出す</Button>;
  }
  it('keeps a toast with an action until it is used, then closes it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const undo = vi.fn();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      setup(
        <ToastButton
          title="作業を削除しました"
          tone="info"
          action={{ label: '元に戻す', altText: '履歴の画面から元に戻せます', onClick: undo }}
        />,
      );
      await user.click(screen.getByRole('button', { name: '出す' }));
      const action = await screen.findByRole('button', { name: '元に戻す' });
      vi.advanceTimersByTime(10000);
      expect(action).toBeInTheDocument();
      expect(action).toHaveAttribute('data-radix-toast-announce-alt', '履歴の画面から元に戻せます');
      await user.click(action);
      expect(undo).toHaveBeenCalledOnce();
      await waitFor(() => expect(screen.queryByText('作業を削除しました')).not.toBeInTheDocument());
    } finally {
      vi.useRealTimers();
    }
  });
  it('still closes a toast without an action on its own', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      setup(<ToastButton title="保存しました" tone="warning" />);
      await user.click(screen.getByRole('button', { name: '出す' }));
      expect(await screen.findByText('保存しました')).toBeInTheDocument();
      vi.advanceTimersByTime(6000);
      await waitFor(() => expect(screen.queryByText('保存しました')).not.toBeInTheDocument());
    } finally {
      vi.useRealTimers();
    }
  });
  it('shows an indeterminate progress in words, without a value', () => {
    setup(<Progress label="書き出しの準備" />);
    const bar = screen.getByRole('progressbar', { name: '書き出しの準備' });
    expect(bar).not.toHaveAttribute('aria-valuenow');
    expect(bar).toHaveAttribute('data-state', 'indeterminate');
    expect(screen.getByText('処理中')).toBeVisible();
  });
  it('tells a finished or failed progress in words, not colour alone', () => {
    setup(
      <>
        <Progress label="同期" value={100} tone="success" />
        <Progress label="書き出し" value={40} tone="danger" statusLabel="3件が失敗" />
      </>,
    );
    expect(screen.getByRole('progressbar', { name: '同期' })).toHaveAccessibleDescription('完了');
    expect(screen.getByRole('progressbar', { name: '書き出し' })).toHaveAccessibleDescription(
      '3件が失敗',
    );
  });
  it('keeps the badge words at every emphasis and size', () => {
    setup(
      <Badge tone="danger" emphasis="strong" size="sm">
        停止
      </Badge>,
    );
    const badge = screen.getByText('停止');
    expect(badge).toHaveClass('lv-badge', 'lv-tone-danger', 'lv-badge--strong', 'lv-badge--sm');
  });
  it('sizes a dialog by its size prop', async () => {
    setup(
      <Dialog trigger={<Button>開く</Button>} title="詳細" description="作業の記録" size="lg">
        本文
      </Dialog>,
    );
    await userEvent.click(screen.getByRole('button', { name: '開く' }));
    expect(screen.getByRole('dialog', { name: '詳細' })).toHaveAttribute('data-size', 'lg');
  });
});

describe('Form parts', () => {
  it('marks a required field in words, read out once by the control', () => {
    setup(
      <TextField
        label="メールアドレス"
        required
        hint="会社のアドレス"
        error="形を確かめてください"
      />,
    );
    const field = screen.getByRole('textbox', { name: 'メールアドレス' });
    expect(field).toBeRequired();
    expect(screen.getByText('必須')).toHaveAttribute('aria-hidden', 'true');
    // The hint stays when an error comes, and both describe the field.
    expect(field).toHaveAccessibleDescription('会社のアドレス 形を確かめてください');
  });
  it('hands id, description, invalid and required to any control in a Field', () => {
    setup(
      <Field label="郵便番号" hint="7桁" error="数字で" required id="zip">
        {(control) => <input {...control} />}
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: '郵便番号' });
    expect(input).toHaveAttribute('id', 'zip');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription('7桁 数字で');
  });
  it('reads a required fieldset by its legend and the word', () => {
    setup(
      <Fieldset legend="お名前" required error="両方を入力してください">
        <TextField label="姓" />
      </Fieldset>,
    );
    const group = screen.getByRole('group', { name: /^お名前\s*必須$/ });
    expect(group).toHaveAccessibleDescription('両方を入力してください');
  });
  it('marks RadioGroup required with the same word', () => {
    setup(
      <RadioGroup
        label="受け取り方法"
        required
        id="plan"
        options={[
          { value: 'a', label: 'メール' },
          { value: 'b', label: '郵送' },
        ]}
      />,
    );
    expect(screen.getByRole('group', { name: /^受け取り方法\s*必須$/ })).toBeVisible();
    expect(screen.getByRole('radio', { name: 'メール' })).toHaveAttribute('id', 'plan');
  });
  it('returns checkbox group values in option order', async () => {
    const change = vi.fn();
    setup(
      <CheckboxGroup
        label="連絡の方法"
        error="1つ以上選んでください"
        options={[
          { value: 'email', label: 'メール' },
          { value: 'sms', label: 'ショートメッセージ' },
          { value: 'post', label: '郵送' },
        ]}
        onValueChange={change}
      />,
    );
    expect(screen.getByRole('group', { name: '連絡の方法' })).toHaveAccessibleDescription(
      '1つ以上選んでください',
    );
    await userEvent.click(screen.getByRole('checkbox', { name: '郵送' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'メール' }));
    expect(change).toHaveBeenLastCalledWith(['email', 'post']);
    expect(screen.getByRole('checkbox', { name: 'メール' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
  it('focuses the error summary when errors appear, and its links focus the fields', async () => {
    const { rerender } = setup(<ErrorSummary errors={[]} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const errors = [{ id: 'name', message: 'お名前を入力してください' }];
    rerender(
      <LievreProvider>
        <ToastProvider>
          <ErrorSummary errors={errors} />
          <TextField id="name" label="お名前" error="お名前を入力してください" />
        </ToastProvider>
      </LievreProvider>,
    );
    const summary = screen.getByRole('alert', { name: '入力の内容を確かめてください' });
    expect(summary).toHaveFocus();
    await userEvent.click(within(summary).getByRole('link', { name: 'お名前を入力してください' }));
    expect(screen.getByRole('textbox', { name: 'お名前' })).toHaveFocus();
  });
});
