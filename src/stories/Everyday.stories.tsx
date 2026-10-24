import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { SCREEN_PARTS } from '../test/layout/screen-parts';
import { ArticleExample, RegistrationExample, ResourceLibrary } from '../patterns/Everyday';
import { expect, userEvent, within } from 'storybook/test';
const meta = {
  title: 'Patterns/Everyday',
  decorators: [
    (Story) => (
      <div className="everyday-story">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layoutGate: {
      screen: '部品を組み合わせた画面。操作の要素の網羅は、それぞれの部品の Story で見る。',
      parts: SCREEN_PARTS,
    } satisfies LayoutGate,
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '管理画面以外の用途で共通部品を確かめる例。検索とカテゴリで読み物を探す、本文を読む、入力→確認→完了と進む。すべてローカル状態で、外部送信やアカウント作成はありません。',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Library: Story = { name: '検索・読み物一覧', render: () => <ResourceLibrary /> };
export const LibraryFlow: Story = {
  ...Library,
  name: '検索・詳細・復帰の操作検証',
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole('textbox', { name: '読み物を検索' }), '見つからない');
    await expect(c.getByText('読み物が見つかりません')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: '検索条件をリセット' }));
    await userEvent.click(c.getByRole('button', { name: '記事を読む：小さく始める、日々の記録' }));
    await expect(
      c.getByRole('heading', { level: 1, name: /^小さく始める、\s*日々の記録$/ }),
    ).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: '← 読み物一覧へ' }));
  },
};
export const Article: Story = { name: '記事・コンテンツ詳細', render: () => <ArticleExample /> };
export const ArticleSave: Story = {
  ...Article,
  name: '記事保存の操作検証',
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'この記事を保存' }));
    await expect(c.getByRole('button', { name: '保存済み' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
};
export const Registration: Story = {
  name: '入力・確認・完了',
  render: () => <RegistrationExample />,
};
export const RegistrationFlow: Story = {
  ...Registration,
  name: '登録フローの操作検証',
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: '入力内容を確認' }));
    await expect(c.getByRole('alert')).toBeVisible();
    await userEvent.type(c.getByRole('textbox', { name: 'お名前' }), '計 花子');
    await userEvent.type(c.getByRole('textbox', { name: 'メールアドレス' }), 'demo@example.com');
    await userEvent.click(c.getByRole('radio', { name: 'チームで使う' }));
    await userEvent.click(c.getByRole('checkbox'));
    await userEvent.click(c.getByRole('button', { name: '入力内容を確認' }));
    await expect(c.getByText('計 花子')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: '修正する' }));
    await expect(c.getByRole('textbox', { name: 'お名前' })).toHaveValue('計 花子');
    await userEvent.click(c.getByRole('button', { name: '入力内容を確認' }));
    await userEvent.click(c.getByRole('button', { name: 'デモを完了する' }));
    await expect(c.getByText('準備ができました')).toBeVisible();
  },
};

export const NarrowLibrary: Story = {
  name: '320px · 一覧',
  render: () => (
    <div style={{ width: 320, maxWidth: '100%' }}>
      <ResourceLibrary />
    </div>
  ),
};
export const NarrowRegistration: Story = {
  name: '320px · 登録',
  render: () => (
    <div style={{ width: 320, maxWidth: '100%' }}>
      <RegistrationExample />
    </div>
  ),
};
