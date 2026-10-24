// Every part that opens over the page keeps the same contract, whatever it is built on:
// it opens from its trigger, carries the theme into the portal, closes on Escape and on a press
// outside, and gives focus back to the trigger after Escape.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import {
  KeiProvider,
  Button,
  Dialog,
  Select,
  Popover,
  DropdownMenu,
  ConfirmDialog,
} from '../index';

type Overlay = {
  name: string;
  ui: ReactNode;
  /** 開くボタンの名前。Select だけは combobox。 */
  trigger: string;
  role: string;
};
const OVERLAYS: Overlay[] = [
  {
    name: 'Dialog',
    ui: (
      <Dialog trigger={<Button>開く</Button>} title="表示設定" description="表示を調整します。">
        <Button>保存</Button>
      </Dialog>
    ),
    trigger: '開く',
    role: 'dialog',
  },
  {
    name: 'Select',
    ui: <Select label="モード" options={[{ value: 'a', label: '標準' }]} />,
    trigger: 'モード',
    role: 'listbox',
  },
  {
    name: 'Popover',
    ui: (
      <Popover trigger={<Button>開く</Button>} title="絞り込み">
        <Button>適用</Button>
      </Popover>
    ),
    trigger: '開く',
    role: 'dialog',
  },
  {
    name: 'DropdownMenu',
    ui: (
      <DropdownMenu
        trigger={<Button>操作</Button>}
        items={[{ label: '複製', onSelect: () => {} }]}
      />
    ),
    trigger: '操作',
    role: 'menu',
  },
  {
    name: 'ConfirmDialog',
    ui: (
      <ConfirmDialog
        trigger={<Button>削除</Button>}
        title="削除しますか？"
        description="元に戻せません。"
        confirmLabel="削除"
        onConfirm={() => {}}
      />
    ),
    trigger: '削除',
    role: 'alertdialog',
  },
];

// Modal layers set pointer-events: none on the page; a real press outside still reaches them.
const user = () => userEvent.setup({ pointerEventsCheck: 0 });
function setup(ui: ReactNode) {
  render(
    <KeiProvider theme="ink" density="compact">
      <p data-testid="outside">外側</p>
      {ui}
    </KeiProvider>,
  );
}

const triggerOf = ({ trigger, role }: Overlay) =>
  screen.getByRole(role === 'listbox' ? 'combobox' : 'button', { name: trigger });

for (const overlay of OVERLAYS)
  describe(`${overlay.name} の開閉`, () => {
    const { ui, role } = overlay;
    it('開いた中身にテーマと密度を引き継ぐ', async () => {
      setup(ui);
      await user().click(triggerOf(overlay));
      const scope = (await screen.findByRole(role)).closest('.kei');
      expect(scope).toHaveAttribute('data-theme', 'ink');
      expect(scope).toHaveAttribute('data-density', 'compact');
    });

    it('Escape で閉じ、フォーカスを開いた元に戻す', async () => {
      setup(ui);
      const u = user();
      const trigger = triggerOf(overlay);
      await u.click(trigger);
      await screen.findByRole(role);
      await u.keyboard('{Escape}');
      expect(screen.queryByRole(role)).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it('外側を押すと閉じる', async () => {
      setup(ui);
      const u = user();
      await u.click(triggerOf(overlay));
      await screen.findByRole(role);
      await u.click(screen.getByTestId('outside'));
      expect(screen.queryByRole(role)).not.toBeInTheDocument();
    });
  });

describe('DropdownMenu の項目', () => {
  it('文字で項目に移り、選ぶと閉じてフォーカスを開いた元に戻す', async () => {
    const remove = vi.fn();
    setup(
      <DropdownMenu
        trigger={<Button>操作</Button>}
        items={[
          { label: '編集', icon: <svg />, onSelect: () => {} },
          { label: '担当を変える', onSelect: () => {} },
          { type: 'separator' },
          { label: '削除', tone: 'danger', onSelect: remove },
        ]}
      />,
    );
    const u = user();
    const trigger = screen.getByRole('button', { name: '操作' });
    trigger.focus();
    await u.keyboard('{Enter}');
    expect(await screen.findByRole('menuitem', { name: '編集' })).toHaveFocus();
    await u.keyboard('削');
    const danger = screen.getByRole('menuitem', { name: '削除' });
    expect(danger).toHaveFocus();
    expect(danger).toHaveAttribute('data-tone', 'danger');
    // Rows without an icon keep the empty icon column, so their text starts in line.
    expect(
      screen.getByRole('menuitem', { name: '担当を変える' }).querySelector('.k-menu-lead'),
    ).toBeInTheDocument();
    await u.keyboard('{Enter}');
    expect(remove).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

describe('ConfirmDialog の実行', () => {
  const confirmDialog = (onConfirm: () => Promise<unknown>) => (
    <ConfirmDialog
      trigger={<Button>3件を削除</Button>}
      title="3件の作業を削除しますか？"
      description="削除した作業は元に戻せません。"
      confirmLabel="3件を削除する"
      tone="danger"
      onConfirm={onConfirm}
    />
  );

  it('初めのフォーカスを取り消し側に置き、終わるまで閉じずに処理中を示す', async () => {
    let finish = () => {};
    setup(confirmDialog(() => new Promise<void>((resolve) => (finish = resolve))));
    const u = user();
    await u.click(screen.getByRole('button', { name: '3件を削除' }));
    const dialog = screen.getByRole('alertdialog', { name: '3件の作業を削除しますか？' });
    expect(dialog).toHaveAccessibleDescription('削除した作業は元に戻せません。');
    expect(screen.getByRole('button', { name: 'キャンセル' })).toHaveFocus();
    const run = screen.getByRole('button', { name: '3件を削除する' });
    expect(run).toHaveClass('k-button--danger');
    await u.click(run);
    expect(run).toHaveAttribute('aria-busy', 'true');
    await u.keyboard('{Escape}');
    expect(dialog).toBeInTheDocument();
    finish();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('失敗したら開いたままにして、もう一度押せるようにする', async () => {
    const onConfirm = vi.fn(() => Promise.reject(new Error('通信できません')));
    setup(confirmDialog(onConfirm));
    const u = user();
    await u.click(screen.getByRole('button', { name: '3件を削除' }));
    await u.click(screen.getByRole('button', { name: '3件を削除する' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '3件を削除する' })).not.toHaveAttribute(
        'aria-busy',
      ),
    );
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});
