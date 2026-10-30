// Mistakes an agent is likely to make with lievre. Each case is a whole consumer file that
// imports '@lievre/react' and exports `Case`. `fix` lists words a message must contain
// for the agent to be able to fix the mistake from the message alone.
export const cases = [
  {
    id: 'textfield-no-label',
    task: 'T1',
    mistake: 'TextField に label を渡さず placeholder だけにする',
    fix: ['label'],
    code: `import { TextField } from '@lievre/react';
export const Case = () => <TextField placeholder="ワークスペース名" />;`,
  },
  {
    id: 'switch-onchange',
    task: 'T1',
    mistake: 'Switch に onChange を渡す（正しくは onCheckedChange）',
    fix: ['onCheckedChange'],
    code: `import { Switch } from '@lievre/react';
export const Case = () => <Switch label="メールで通知する" onChange={() => {}} />;`,
  },
  {
    id: 'button-submit',
    task: 'T1',
    mistake: 'form の中の Button を送信ボタンのつもりで置く（既定は type="button"）',
    fix: ['type="submit"', "type='submit'", 'submit'],
    code: `import { Button } from '@lievre/react';
export const Case = () => (
  <form onSubmit={(e) => e.preventDefault()}>
    <Button variant="primary">保存する</Button>
  </form>
);`,
  },
  {
    id: 'toast-outside-provider',
    task: 'T1',
    mistake: 'ToastProvider の外で useToast を呼ぶ',
    bare: true,
    fix: ['ToastProvider'],
    code: `import { useToast } from '@lievre/react';
export const Case = () => {
  const toast = useToast();
  return <button onClick={() => toast({ title: '保存しました' })}>保存</button>;
};`,
  },
  {
    id: 'toast-tone-danger',
    task: 'T3',
    mistake: "Toast の tone に Badge と同じ 'danger' を渡す（正しくは 'error'）",
    fix: ['error'],
    code: `import { useToast } from '@lievre/react';
export const Case = () => {
  const toast = useToast();
  return <button onClick={() => toast({ title: '削除できません', tone: 'danger' })}>削除</button>;
};`,
  },
  {
    id: 'no-lievre-provider',
    task: 'T1',
    mistake: 'LievreProvider で包まずに部品を置く（.lievre の外ではスタイルが効かない）',
    bare: true,
    fix: ['LievreProvider'],
    code: `import { Button } from '@lievre/react';
export const Case = () => <Button variant="primary">保存する</Button>;`,
  },
  {
    id: 'table-page-before-sort',
    task: 'T2',
    mistake:
      '区切った1ページ分の rows を DataTable に渡し、Pagination を横に置く（並べ替えは1ページの中だけになる）',
    fix: ['pageSize'],
    code: `import { DataTable, Pagination } from '@lievre/react';
import { useState } from 'react';
type Row = { id: string; amount: number };
const all: Row[] = Array.from({ length: 20 }, (_, i) => ({ id: 'INV-' + i, amount: (i * 37) % 20 }));
export const Case = () => {
  const [page, setPage] = useState(1);
  return (
    <>
      <DataTable
        caption="請求書"
        rows={all.slice((page - 1) * 10, page * 10)}
        getRowId={(r) => r.id}
        columns={[{ key: 'amount', header: '金額', render: (r) => r.amount, sortValue: (r) => r.amount }]}
      />
      <Pagination page={page} totalPages={2} onPageChange={setPage} />
    </>
  );
};`,
  },
  {
    id: 'table-no-caption',
    task: 'T2',
    mistake: 'DataTable に caption を渡さない',
    fix: ['caption'],
    code: `import { DataTable } from '@lievre/react';
export const Case = () => (
  <DataTable rows={[{ id: 'a' }]} getRowId={(r) => r.id} columns={[{ key: 'id', header: 'ID', render: (r) => r.id }]} />
);`,
  },
  {
    id: 'table-columns-accessor',
    task: 'T2',
    mistake: 'TanStack 風に accessorKey / cell で列を書く',
    fix: ['render', 'key'],
    code: `import { DataTable } from '@lievre/react';
export const Case = () => (
  <DataTable
    caption="請求書"
    rows={[{ id: 'a' }]}
    getRowId={(r) => r.id}
    columns={[{ accessorKey: 'id', header: 'ID', cell: (r: { id: string }) => r.id }]}
  />
);`,
  },
  {
    id: 'unit-inside-mono',
    task: 'T2',
    mistake: '単位を .lv-mono の中に入れる',
    fix: ['.lv-mono の外', 'lv-mono'],
    code: `export const Case = () => <span className="lv-mono">{1200}%</span>;`,
  },
  {
    id: 'dialog-no-description',
    task: 'T3',
    mistake: 'Dialog に description を渡さない',
    fix: ['description'],
    code: `import { Dialog, Button } from '@lievre/react';
export const Case = () => (
  <Dialog trigger={<Button>削除</Button>} title="プロジェクトを削除">本文</Dialog>
);`,
  },
  {
    id: 'dialog-variant-destructive',
    task: 'T3',
    mistake: "危険な操作に shadcn と同じ variant='destructive' を使う",
    fix: ['danger'],
    code: `import { Button } from '@lievre/react';
export const Case = () => <Button variant="destructive">削除する</Button>;`,
  },
  {
    id: 'dialog-cancel-not-close',
    task: 'T3',
    mistake: 'footer のキャンセルを DialogClose で包まない（押しても閉じない）',
    fix: ['DialogClose'],
    code: `import { Dialog, Button } from '@lievre/react';
export const Case = () => (
  <Dialog
    open
    trigger={<Button>削除</Button>}
    title="プロジェクトを削除"
    description="この操作は取り消せません。"
    footer={<Button>キャンセル</Button>}
  >
    本文
  </Dialog>
);`,
  },
  {
    id: 'select-children',
    task: 'T4',
    mistake: 'Select に option を子として渡す（正しくは options）',
    fix: ['options'],
    code: `import { Select } from '@lievre/react';
export const Case = () => (
  <Select label="プラン">
    <option value="lite">ライト</option>
  </Select>
);`,
  },
  {
    id: 'radio-onchange',
    task: 'T4',
    mistake: 'RadioGroup に onChange を渡す（正しくは onValueChange）',
    fix: ['onValueChange'],
    code: `import { RadioGroup } from '@lievre/react';
export const Case = () => (
  <RadioGroup label="支払い方法" options={[{ value: 'card', label: 'クレジットカード' }]} onChange={() => {}} />
);`,
  },
  {
    id: 'checkbox-checked-change',
    task: 'T4',
    mistake: 'Checkbox の onCheckedChange を boolean として受ける（indeterminate がある）',
    fix: ['indeterminate'],
    code: `import { Checkbox } from '@lievre/react';
import { useState } from 'react';
export const Case = () => {
  const [agreed, setAgreed] = useState(false);
  return <Checkbox label="利用規約に同意する" checked={agreed} onCheckedChange={setAgreed} />;
};`,
  },
  {
    id: 'select-error-without-label',
    task: 'T4',
    mistake: 'エラー文を部品の外に p で置き、error に渡さない',
    fix: ['error'],
    code: `import { Select } from '@lievre/react';
export const Case = () => (
  <div>
    <Select label="プラン" options={[{ value: 'lite', label: 'ライト' }]} />
    <p>プランを選んでください</p>
  </div>
);`,
  },
  {
    id: 'metric-unit-in-value',
    task: 'T5',
    mistake: 'Metric の value に単位まで入れる（"99.95%"）',
    fix: ['unit'],
    code: `import { Metric } from '@lievre/react';
export const Case = () => <Metric label="稼働率" value="99.95%" change="+0.02" trend="up" />;`,
  },
  {
    id: 'badge-color-only',
    task: 'T5',
    mistake: 'Badge を色と点だけにして文字を入れない',
    fix: ['children', '文字'],
    code: `import { Badge } from '@lievre/react';
export const Case = () => <Badge tone="danger" dot />;`,
  },
  {
    id: 'badge-tone-error',
    task: 'T5',
    mistake: "Badge の tone に Toast と同じ 'error' を渡す（正しくは 'danger'）",
    fix: ['danger'],
    code: `import { Badge } from '@lievre/react';
export const Case = () => <Badge tone="error">停止</Badge>;`,
  },
  {
    id: 'tabs-no-label',
    task: 'T5',
    mistake: 'Tabs に label を渡さない',
    fix: ['label'],
    code: `import { Tabs } from '@lievre/react';
export const Case = () => <Tabs items={[{ value: 'a', label: '概要', content: '本文' }]} />;`,
  },
];
