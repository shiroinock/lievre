import { useId, useMemo, useState } from 'react';
import { Plus, Download, Search, SlidersHorizontal, ChevronRight } from 'lucide-react';
import {
  KeiProvider,
  Badge,
  Button,
  Card,
  Checkbox,
  DataTable,
  DescriptionList,
  Dialog,
  DialogClose,
  EmptyState,
  Meter,
  Metric,
  Pagination,
  Progress,
  Select,
  TextField,
  Textarea,
  ToastProvider,
  useToast,
  type Column,
  type TableSort,
} from '../index';

export type WorkItem = {
  id: string;
  name: string;
  category: string;
  status: '稼働中' | '要確認' | '待機中';
  owner: string;
  updated: string;
  priority: number;
  notes?: string;
};
export const initialWork: WorkItem[] = [
  {
    id: 'KEI-024',
    name: 'センサーログの同期',
    category: 'データ収集',
    status: '稼働中',
    owner: '佐藤',
    updated: '14:32',
    priority: 1,
  },
  {
    id: 'KEI-023',
    name: '週次レポートの生成',
    category: 'レポート',
    status: '稼働中',
    owner: '田中',
    updated: '14:28',
    priority: 2,
  },
  {
    id: 'KEI-022',
    name: 'ゲートウェイの接続確認',
    category: 'インフラ',
    status: '要確認',
    owner: '鈴木',
    updated: '14:15',
    priority: 1,
  },
  {
    id: 'KEI-021',
    name: 'アーカイブの整合性検証',
    category: 'データ管理',
    status: '待機中',
    owner: '佐藤',
    updated: '13:50',
    priority: 3,
  },
  {
    id: 'KEI-020',
    name: '温度データの正規化',
    category: 'データ収集',
    status: '稼働中',
    owner: '山本',
    updated: '13:42',
    priority: 2,
  },
  {
    id: 'KEI-019',
    name: 'バックアップの差分確認',
    category: 'データ管理',
    status: '待機中',
    owner: '田中',
    updated: '13:20',
    priority: 3,
  },
  {
    id: 'KEI-018',
    name: 'エッジ端末の更新',
    category: 'インフラ',
    status: '要確認',
    owner: '鈴木',
    updated: '12:56',
    priority: 1,
  },
  {
    id: 'KEI-017',
    name: '品質レポートの配信準備',
    category: 'レポート',
    status: '稼働中',
    owner: '山本',
    updated: '12:30',
    priority: 2,
  },
];
export function WorkBadge({ status }: { status: WorkItem['status'] }) {
  return (
    <Badge dot tone={status === '稼働中' ? 'success' : status === '要確認' ? 'warning' : 'neutral'}>
      {status}
    </Badge>
  );
}
const priorityNames = ['', '高', '中', '低'];

export function NewWorkDialog({ onCreate }: { onCreate: (item: WorkItem) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('2');
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const id = useId();
  const toast = useToast();
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setName('');
          setError('');
          setNotes('');
          setPriority('2');
        }
      }}
      trigger={
        <Button variant="primary" icon={<Plus size={15} />}>
          作業を追加
        </Button>
      }
      title="新しい作業"
      description="作業キューに項目を追加します。このデモの変更は再読み込みでリセットされます。"
      footer={
        <>
          <DialogClose asChild>
            <Button>キャンセル</Button>
          </DialogClose>
          <Button variant="primary" type="submit" form={id}>
            作業を追加
          </Button>
        </>
      }
    >
      <form
        id={id}
        className="k-form-stack"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) {
            setError('作業名を入力してください。');
            return;
          }
          onCreate({
            id: `KEI-${Date.now().toString().slice(-6)}`,
            name: name.trim(),
            category: 'カスタム',
            status: '待機中',
            owner: '自分',
            updated: '14:33',
            priority: Number(priority),
            notes: notes.trim(),
          });
          setOpen(false);
          toast({ title: '作業を追加しました', description: name.trim() });
        }}
      >
        <TextField
          label="作業名"
          placeholder="例：センサーログの同期"
          required
          maxLength={80}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError('');
          }}
          error={error}
        />
        <Select
          label="優先度"
          value={priority}
          onValueChange={setPriority}
          options={[
            { value: '1', label: '高 — 優先して対応' },
            { value: '2', label: '中 — 通常の対応' },
            { value: '3', label: '低 — 時間があるときに' },
          ]}
        />
        <Textarea
          label="作業メモ"
          placeholder="補足や注意点を入力"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          hint="手順や確認しておきたいことを入力してください。"
        />
      </form>
    </Dialog>
  );
}
function WorkDetails({ item }: { item: WorkItem }) {
  return (
    <Dialog
      trigger={
        <Button
          size="sm"
          variant="ghost"
          aria-label={`${item.id} の詳細を開く`}
          icon={<ChevronRight size={14} />}
        >
          詳細
        </Button>
      }
      title={item.name}
      description={`${item.id} / ${item.category}`}
      footer={
        <DialogClose asChild>
          <Button>閉じる</Button>
        </DialogClose>
      }
    >
      <div className="k-form-stack">
        <DescriptionList
          layout="stack"
          columns={2}
          items={[
            { label: '状態', value: <WorkBadge status={item.status} /> },
            { label: '担当', value: item.owner },
            { label: '優先度', value: priorityNames[item.priority] },
            { label: '最終更新', value: item.updated, mono: true },
            ...(item.notes
              ? [
                  {
                    label: 'メモ',
                    value: <span className="work-detail-notes">{item.notes}</span>,
                    wide: true,
                  },
                ]
              : []),
          ]}
        />
        <Progress
          value={item.status === '稼働中' ? 68 : item.status === '待機中' ? 0 : 32}
          label="処理の進捗（サンプル）"
        />
      </div>
    </Dialog>
  );
}
export function OperationsExample({ compact = false }: { compact?: boolean }) {
  return (
    <KeiProvider typography="interface">
      <ToastProvider>
        <OperationsContent compact={compact} />
      </ToastProvider>
    </KeiProvider>
  );
}
function OperationsContent({ compact }: { compact: boolean }) {
  const [rows, setRows] = useState(initialWork);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<TableSort>(null);
  const toast = useToast();
  const filtered = rows.filter(
    (row) =>
      (status === 'all' || row.status === status) &&
      `${row.name} ${row.id} ${row.owner} ${row.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / 5));
  const current = Math.min(page, totalPages);
  const columns = useMemo<Column<WorkItem>[]>(
    () => [
      {
        key: 'name',
        header: '作業名',
        sortValue: (r) => r.name,
        render: (r) => (
          <div className="work-name">
            <span>{r.name}</span>
            <small>
              <span className="k-mono">{r.id}</span> · {r.category}
            </small>
          </div>
        ),
      },
      {
        key: 'status',
        header: '状態',
        sortValue: (r) => r.status,
        render: (r) => <WorkBadge status={r.status} />,
      },
      {
        key: 'owner',
        header: '担当',
        render: (r) => (
          <span className="work-owner">
            <span className="work-owner-dot" aria-hidden>
              {r.owner[0]}
            </span>
            {r.owner}
          </span>
        ),
      },
      {
        key: 'priority',
        header: '優先度',
        sortValue: (r) => r.priority,
        render: (r) => (
          <span className="work-priority">
            <i data-priority={r.priority} aria-hidden />
            {priorityNames[r.priority]}
          </span>
        ),
      },
      {
        key: 'updated',
        header: '更新',
        sortValue: (r) => r.updated,
        render: (r) => <span className="k-mono k-muted">{r.updated}</span>,
      },
      { key: 'actions', header: '詳細', render: (r) => <WorkDetails item={r} /> },
    ],
    [],
  );
  const sortColumn = columns.find((c) => c.key === sorting?.key);
  const ordered =
    sorting && sortColumn?.sortValue
      ? [...filtered].sort((a, b) => {
          const av = sortColumn.sortValue!(a),
            bv = sortColumn.sortValue!(b);
          return (
            (typeof av === 'number' && typeof bv === 'number'
              ? av - bv
              : String(av).localeCompare(String(bv), 'ja', { numeric: true })) *
            (sorting.direction === 'asc' ? 1 : -1)
          );
        })
      : filtered;
  const pageRows = ordered.slice((current - 1) * 5, current * 5);
  const exportCsv = () => {
    const csv =
      '\uFEFFID,作業名,状態,担当\n' +
      filtered
        .map((r) =>
          [r.id, r.name, r.status, r.owner]
            .map((v) => '"' + (/^[=+@-]/.test(v) ? "'" + v : v).replaceAll('"', '""') + '"')
            .join(','),
        )
        .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kei-work-items.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'CSVを書き出しました', description: `${filtered.length}件の作業` });
  };
  return (
    <div className="operations-example">
      <div className="operations-heading">
        <div>
          <h2>
            作業モニター<Badge>サンプル</Badge>
          </h2>
          <p>いま動いている作業と、次に必要なアクション。</p>
        </div>
        <div className="button-row">
          <Button icon={<Download size={14} />} onClick={exportCsv}>
            CSV書き出し
          </Button>
          <NewWorkDialog
            onCreate={(r) => {
              setRows((prev) => [r, ...prev]);
              setQuery('');
              setStatus('all');
              setPage(1);
            }}
          />
        </div>
      </div>
      <div className="metrics-grid">
        <Metric
          label="稼働中の作業"
          value={String(rows.filter((r) => r.status === '稼働中').length)}
          unit="件"
          change="通常稼働"
          trend="up"
          values={[14, 18, 17, 24, 20, 28, 26, 35, 31, 42, 38, 46]}
        />
        <Metric
          label="処理の成功率"
          value="99.2"
          unit="%"
          change="前週比 +0.8%"
          trend="up"
          values={[80, 83, 82, 85, 83, 88, 86, 91, 90, 95, 94, 99]}
        />
        <Metric
          label="平均処理時間"
          value="1.84"
          unit="秒"
          change="前週比 −0.24秒"
          values={[38, 32, 34, 25, 28, 20, 23, 19, 21, 14, 16, 12]}
        />
        <Metric
          label="確認が必要"
          value={String(rows.filter((r) => r.status === '要確認').length)}
          unit="件"
          change="接続と更新を確認"
          values={[0, 0, 0, 1, 1, 0, 1, 1, 2, 2, 2, 2]}
        />
      </div>
      <section className="queue-panel">
        <div className="queue-title">
          <div>
            <h3>
              作業キュー <span className="queue-count">{rows.length}件</span>
            </h3>
          </div>
          <Badge dot tone="success">
            接続中（サンプル）
          </Badge>
        </div>
        <div className="queue-tools">
          <div className="queue-search">
            <Search size={14} aria-hidden />
            <TextField
              label="作業を検索"
              placeholder="作業名・ID・担当で検索"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="queue-filter">
            <SlidersHorizontal size={13} aria-hidden />
            <Select
              label="状態で絞り込み"
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'すべての状態' },
                { value: '稼働中', label: '稼働中' },
                { value: '要確認', label: '要確認' },
                { value: '待機中', label: '待機中' },
              ]}
            />
          </div>
        </div>
        {selected.length > 0 && (
          <div className="queue-selection" role="status">
            <span>{selected.length}件を選択中</span>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              選択解除
            </Button>
          </div>
        )}
        <DataTable
          rows={pageRows}
          columns={columns}
          getRowId={(r) => r.id}
          caption="作業キュー：作業名・状態・担当・優先度・更新時刻"
          selectable
          selectedIds={selected}
          onSelectionChange={setSelected}
          sorting={sorting}
          onSortingChange={(value) => {
            setSorting(value);
            setPage(1);
          }}
        />
        <footer className="queue-footer">
          <span className="k-muted">
            {filtered.length
              ? `${(current - 1) * 5 + 1}–${Math.min(current * 5, filtered.length)}`
              : '0'}{' '}
            / {filtered.length} 件
          </span>
          <Pagination page={current} totalPages={totalPages} onPageChange={setPage} />
        </footer>
      </section>
      {!compact && (
        <div className="operations-lower">
          <Card title="システムの負荷" action={<Badge>過去24時間</Badge>}>
            <div className="capacity-content">
              <Meter value={68} label="リソース使用率" />
              <div className="capacity-bars">
                <Progress value={42} label="CPU" />
                <Progress value={68} label="メモリ" />
                <Progress value={31} label="ストレージ" />
                <p className="capacity-note">80%を超えたら増設を検討します。</p>
              </div>
            </div>
          </Card>
          <Card title="最近のアクティビティ">
            <ul className="activity-list">
              {[
                { time: '14:32', label: 'センサーログの同期を開始', id: 'KEI-024' },
                { time: '14:28', label: '週次レポートを生成', id: 'KEI-023' },
                { time: '14:15', label: 'ゲートウェイの再接続が必要', id: 'KEI-022' },
                { time: '13:50', label: 'アーカイブ検証を予約', id: 'KEI-021' },
              ].map((a, i) => (
                <li key={a.id}>
                  <span className="activity-dot" data-warning={i === 2} />
                  <time className="k-mono">{a.time}</time>
                  <div>
                    {a.label}
                    <small className="k-mono">{a.id}</small>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

export function SettingsExample() {
  const toast = useToast();
  const [saved, setSaved] = useState(false);
  return (
    <Card title="ワークスペース設定">
      <form
        className="k-form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
          toast({
            title: '設定を保存しました',
            description: 'このデモの変更は再読み込みでリセットされます。',
          });
        }}
      >
        <TextField
          label="ワークスペース名"
          defaultValue="計測ラボ"
          required
          hint="ナビゲーションとレポートのヘッダーに表示されます。"
        />
        <Select
          label="タイムゾーン"
          defaultValue="tokyo"
          options={[
            { value: 'tokyo', label: 'Asia/Tokyo (UTC+09:00)' },
            { value: 'utc', label: 'UTC (UTC+00:00)' },
          ]}
        />
        <Checkbox
          label="週次レポートを受け取る"
          defaultChecked
          hint="毎週月曜に先週の稼働状況をまとめます。デモでは送信されません。"
        />
        <div className="button-row">
          <Button type="submit" variant="primary">
            設定を保存
          </Button>
          {saved && (
            <span role="status" className="k-text-success">
              保存済み
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}
