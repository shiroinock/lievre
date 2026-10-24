// Every part that opens over the page keeps the same contract, whatever it is built on:
// it opens from its trigger, carries the theme into the portal, closes on Escape and on a press
// outside, and gives focus back to the trigger after Escape.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { KeiProvider, Button, Dialog, Select, Popover, DropdownMenu } from '../index';

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
