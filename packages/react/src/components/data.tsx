import {
  Fragment,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import {
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react';
import { cx } from './system';
import { EmptyState, Pagination, Skeleton, VisuallyHidden } from './primitives';

export function Sparkline({
  values,
  label,
  color = 'accent',
}: {
  values: number[];
  label: string;
  color?: 'accent' | 'success' | 'muted';
}) {
  const id = useId().replace(/:/g, '');
  const safe = values.filter(Number.isFinite);
  const low = Math.min(...safe),
    high = Math.max(...safe);
  const points = safe
    .map(
      (v, i) =>
        `${(i / Math.max(1, safe.length - 1)) * 200},${45 - ((v - low) / (high - low || 1)) * 35}`,
    )
    .join(' ');
  return (
    <svg
      className={cx('lv-sparkline', `lv-sparkline--${color}`)}
      viewBox="0 0 200 50"
      // Stretch to the box: the stroke stays 2px (non-scaling), so only the data is scaled.
      preserveAspectRatio="none"
      role="img"
      aria-labelledby={id}
    >
      <title id={id}>{label}</title>
      <path d="M0 45H200M0 25H200M0 5H200" className="lv-chart-grid" />
      {safe.length > 1 && (
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          points={points}
        />
      )}
    </svg>
  );
}
/** 測った値の読み値。value は等幅、unit は本文の書体で並べます。 */
export function Metric({
  label,
  value,
  unit,
  change,
  trend = 'neutral',
  values,
  code,
}: {
  label: string;
  /** 数値だけ（"99.95"）。単位は unit に分けます。 */
  value: string;
  /** "%"・"円" など。 */
  unit?: string;
  /** 変化の文。矢印は読み上げないため、向きは言葉で書きます（"前週比 +0.02 ポイント上昇"）。 */
  change?: string;
  /** 矢印と色だけを変えます。 */
  trend?: 'up' | 'down' | 'neutral';
  values?: number[];
  code?: string;
}) {
  return (
    <section className="lv-metric" aria-label={label}>
      <div className="lv-metric-top">
        <span>{label}</span>
        {code && <span className="lv-metric-code">{code}</span>}
      </div>
      <div className="lv-metric-value">
        {value}
        <span>{unit}</span>
      </div>
      <div
        className={cx(
          'lv-metric-change',
          trend === 'up' && 'lv-text-success',
          trend === 'down' && 'lv-text-danger',
        )}
      >
        {trend === 'up' && <ArrowUpRight size={14} aria-hidden />}
        {trend === 'down' && <ArrowDownRight size={14} aria-hidden />}
        {change ?? '—'}
      </div>
      {values && (
        <Sparkline
          values={values}
          label={`${label}の推移`}
          color={trend === 'up' ? 'success' : 'accent'}
        />
      )}
    </section>
  );
}
export function Meter({
  value,
  label,
  unit = '%',
  max = 100,
}: {
  value: number;
  label: string;
  unit?: string;
  max?: number;
}) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safe = Math.max(0, Math.min(safeMax, Number.isFinite(value) ? value : 0));
  const degrees = -135 + (safe / safeMax) * 270;
  return (
    <div
      className="lv-meter"
      role="meter"
      aria-label={label}
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={safeMax}
    >
      <div className="lv-meter-face" aria-hidden>
        <div className="lv-meter-ticks" />
        <div className="lv-meter-hand" style={{ transform: `rotate(${degrees}deg)` }} />
        <span className="lv-meter-hub" />
      </div>
      <div className="lv-meter-reading" aria-hidden>
        <strong>
          {safe}
          <small>{unit}</small>
        </strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

export type Column<T> = {
  key: string;
  header: string;
  /** セルの中身。数値は `<span className="lv-mono">` で包み、単位はその外に置きます。 */
  render: (row: T) => ReactNode;
  /** 渡した列だけ並べ替えられます。 */
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right';
  width?: string;
};
export type TableSort = { key: string; direction: 'asc' | 'desc' } | null;
type DataTableBaseProps<T> = {
  /** 表示する行。dataMode が 'client'（既定）なら絞り込んだ全件を渡します。DataTable が並べ替えてから pageSize ごとに区切るので、自分で区切った行は渡しません。'server' なら、サーバーが並べ替えて区切った1ページ分を渡します。 */
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  /** 表の名前。画面には出さず、読み上げに使います。 */
  caption: string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onRowClick?: (row: T) => void;
  /** 読み込み中の表示。dataMode="server" では、取り直している間は true にします。そのあいだの totalCount は古いことがあるので、範囲外のページを合わせるのは読み込みが終わってからです。 */
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  /** 表の高さの上限（'24rem' など）。超えると表の中で縦にスクロールし、見出しの行を上に残します。 */
  maxHeight?: string;
  /** 行を広げて出す中身。渡すと各行の先頭に開閉のボタン（aria-expanded）を置き、押すとその行のすぐ下に中身を出します。 */
  renderExpanded?: (row: T) => ReactNode;
  /** 広げている行の id。渡すと外で持ちます。 */
  expandedIds?: string[];
  onExpandedChange?: (ids: string[]) => void;
  /** 下のページ送りの形。'compact'（既定）は前後のボタンと「2 / 5」、'numbers' はページ番号を並べます。pageSize を渡したときだけ効きます。 */
  paginationVariant?: 'compact' | 'numbers';
  /** 選べる1ページの件数（[20, 50, 100]）。渡すと下のページ送りに「表示件数」を出します。pageSize は外で持ち、onPageSizeChange で変えます。変えると1ページ目に戻ります。 */
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
};
/** 並べ替えとページ分けを DataTable が手元で行う形（既定）。 */
export type DataTableClientProps = {
  /** 'client'（既定）は、rows の全件を手元で並べ替えてから区切ります。'server' は並べ替えもページ分けもサーバーに任せ、受け取った1ページ分の rows を並べ替えずにそのまま描きます。'server' では sorting・onSortingChange・pageSize・page・onPageChange・totalCount が必須です。 */
  dataMode?: 'client';
  /** 並べ替えの状態。'client' では渡すと外で持ち、'server' ではいまサーバーに頼んでいる並べ替えを渡します（見出しの矢印と aria-sort に使います）。見出しを押すたびに昇順と降順を切り替え、解除はしません。 */
  sorting?: TableSort;
  /** 見出しを押したときに呼びます。'server' ではこの並べ替えで取り直します。ページ送りがあって1ページ目でなければ、続けて onPageChange(1) も呼びます。 */
  onSortingChange?: (sort: TableSort) => void;
  /** 1ページの行数。渡すと表の下に件数とページ送り（Pagination）を描きます。'client' では全件を並べ替えてから区切ります。並べ替えを変えると1ページ目に戻ります。 */
  pageSize?: number;
  /** 表示するページ（1始まり）。'client' では渡さなければ DataTable が持ちます。行が減ってページが足りなくなると、最後のページ（0件なら1ページ目）に合わせて onPageChange を呼びます。絞り込みを変えたときに1ページ目へ戻すなら、外で持って 1 にします。 */
  page?: number;
  /** ページが変わるときに呼びます。ページ送りのほか、並べ替えを変えて1ページ目に戻るときも呼びます。'server' ではこのページを取り直します。 */
  onPageChange?: (page: number) => void;
  totalCount?: never;
};
/** 並べ替えとページ分けをサーバーに任せる形。rows はサーバーから受け取った1ページ分です。 */
export type DataTableServerProps = {
  dataMode: 'server';
  sorting: TableSort;
  onSortingChange: NonNullable<DataTableClientProps['onSortingChange']>;
  pageSize: number;
  page: number;
  onPageChange: NonNullable<DataTableClientProps['onPageChange']>;
  /** dataMode="server" のとき、サーバーにある全件の数（絞り込んだ後）。ページ数と件数の表示に使います。 */
  totalCount: number;
};
export type DataTableProps<T> = DataTableBaseProps<T> &
  (DataTableClientProps | DataTableServerProps);
/** ネイティブtableの意味論を維持。ソート・選択・空/読込状態・ページ送りを備えます。ページ送りは pageSize を渡して DataTable に描かせ、Pagination を横に並べて自分で区切ることはしません。 */
export function DataTable<T>(props: DataTableProps<T>) {
  const {
    rows,
    columns,
    getRowId,
    caption,
    selectable = false,
    selectedIds,
    onSelectionChange,
    onRowClick,
    loading = false,
    emptyTitle = '該当するデータがありません',
    emptyDescription = '条件を変えてもう一度検索してください。',
    sorting,
    onSortingChange,
    pageSize,
    page,
    onPageChange,
    maxHeight,
    renderExpanded,
    expandedIds,
    onExpandedChange,
    paginationVariant = 'compact',
    pageSizeOptions,
    onPageSizeChange,
  } = props;
  const tableId = useId();
  const [internalExpanded, setInternalExpanded] = useState<string[]>([]);
  const expanded = expandedIds ?? internalExpanded;
  const toggleExpanded = (id: string) => {
    const next = expanded.includes(id) ? expanded.filter((v) => v !== id) : [...expanded, id];
    setInternalExpanded(next);
    onExpandedChange?.(next);
  };
  const expandable = !!renderExpanded;
  const span = columns.length + (selectable ? 1 : 0) + (onRowClick ? 1 : 0) + (expandable ? 1 : 0);
  const server = props.dataMode === 'server';
  const [internalSort, setInternalSort] = useState<TableSort>(null);
  const sort = sorting === undefined ? internalSort : sorting;
  const [internalPage, setInternalPage] = useState(1);
  const size = pageSize === undefined ? undefined : Math.max(1, Math.floor(pageSize) || 1);
  const total = props.dataMode === 'server' ? Math.max(0, props.totalCount) : rows.length;
  const totalPages = size ? Math.max(1, Math.ceil(total / size)) : 1;
  const requested = Math.max(1, page ?? internalPage);
  const current = Math.min(totalPages, requested);
  const setPage = (value: number) => {
    setInternalPage(value);
    onPageChange?.(value);
  };
  // A page past the end (fewer rows, or a server total that shrank) is moved to the last page
  // and reported once, so the app fetches it and an inner page does not jump back later.
  // The server's total is only trusted once it has finished loading.
  const synced = useRef<string | null>(null);
  const settled = !(server && loading);
  useEffect(() => {
    if (requested === current || !settled) {
      synced.current = null;
      return;
    }
    const key = `${requested}>${current}`;
    if (synced.current === key) return;
    synced.current = key;
    setPage(current);
    // setPage is a new function each render; what it reports is in the dependencies.
  }, [requested, current, settled]);
  const setSort = (value: TableSort) => {
    setInternalSort(value);
    onSortingChange?.(value);
    // A new order starts over from its first rows; staying on page 3 would show a random slice.
    if (size && current !== 1) setPage(1);
  };
  const [internal, setInternal] = useState<string[]>([]);
  const selection = selectedIds ?? internal;
  const select = (ids: string[]) => {
    setInternal(ids);
    onSelectionChange?.(ids);
  };
  // Sort every row first, then cut the page: the order cannot be applied to a slice by mistake.
  const shown = useMemo(() => {
    if (server) return rows;
    const col = columns.find((c) => c.key === sort?.key);
    let sorted = rows;
    if (sort && col?.sortValue) {
      const value = col.sortValue;
      sorted = [...rows].sort((a, b) => {
        const av = value(a),
          bv = value(b);
        return (
          (typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av).localeCompare(String(bv), 'ja', { numeric: true })) *
          (sort.direction === 'asc' ? 1 : -1)
        );
      });
    }
    return size ? sorted.slice((current - 1) * size, current * size) : sorted;
  }, [server, rows, columns, sort, size, current]);
  const visibleIds = shown.map(getRowId);
  const all = shown.length > 0 && visibleIds.every((id) => selection.includes(id));
  const some = visibleIds.some((id) => selection.includes(id));
  const table = (
    <div
      className="lv-table-wrap"
      role="region"
      aria-label={`${caption}（横スクロール対応）`}
      tabIndex={0}
      data-sticky={maxHeight ? true : undefined}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table className="lv-table">
        <caption className="lv-sr-only">{caption}</caption>
        <thead>
          <tr>
            {expandable && (
              <th scope="col" className="lv-table-expand">
                <VisuallyHidden>開閉</VisuallyHidden>
              </th>
            )}
            {selectable && (
              <th scope="col" className="lv-table-select">
                <input
                  type="checkbox"
                  aria-label="表示中のすべてを選択"
                  checked={all}
                  ref={(el) => {
                    if (el) el.indeterminate = some && !all;
                  }}
                  onChange={() =>
                    select(
                      all
                        ? selection.filter((id) => !visibleIds.includes(id))
                        : [...new Set([...selection, ...visibleIds])],
                    )
                  }
                  disabled={loading || !shown.length}
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                scope="col"
                key={col.key}
                style={{ width: col.width, textAlign: col.align }}
                aria-sort={
                  col.sortValue
                    ? sort?.key === col.key
                      ? sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                    : undefined
                }
              >
                {col.sortValue ? (
                  <button
                    className="lv-table-sort"
                    onClick={() =>
                      setSort({
                        key: col.key,
                        direction:
                          sort?.key === col.key && sort.direction === 'asc' ? 'desc' : 'asc',
                      })
                    }
                  >
                    {col.header}
                    {sort?.key === col.key ? (
                      sort.direction === 'asc' ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )
                    ) : (
                      <ArrowUpDown size={12} />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
            {onRowClick && (
              <th scope="col">
                <VisuallyHidden>操作</VisuallyHidden>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 4 }, (_, i) => (
              <tr key={i}>
                {expandable && <td />}
                {selectable && (
                  <td>
                    <Skeleton width={14} />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key}>
                    <Skeleton height={18} />
                  </td>
                ))}
                {onRowClick && (
                  <td>
                    <Skeleton width={24} />
                  </td>
                )}
              </tr>
            ))
          ) : shown.length ? (
            shown.map((row) => {
              const id = getRowId(row);
              const open = expanded.includes(id);
              const detailId = `${tableId}-${id}-expanded`;
              return (
                <Fragment key={id}>
                  <tr
                    data-selected={selection.includes(id) || undefined}
                    data-expanded={open || undefined}
                  >
                    {expandable && (
                      <td className="lv-table-expand">
                        <button
                          type="button"
                          className="lv-table-toggle"
                          aria-label={`${id} の中身`}
                          aria-expanded={open}
                          aria-controls={open ? detailId : undefined}
                          onClick={() => toggleExpanded(id)}
                        >
                          <ChevronRight size={16} aria-hidden />
                        </button>
                      </td>
                    )}
                    {selectable && (
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`${id} を選択`}
                          checked={selection.includes(id)}
                          onChange={() =>
                            select(
                              selection.includes(id)
                                ? selection.filter((v) => v !== id)
                                : [...selection, id],
                            )
                          }
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} style={{ textAlign: col.align }}>
                        {col.render(row)}
                      </td>
                    ))}
                    {onRowClick && (
                      <td>
                        <button
                          className="lv-table-detail"
                          aria-label={`${id} の詳細を開く`}
                          onClick={() => onRowClick(row)}
                        >
                          詳細
                          <ChevronRight size={14} aria-hidden />
                        </button>
                      </td>
                    )}
                  </tr>
                  {open && renderExpanded && (
                    <tr className="lv-table-expanded" id={detailId}>
                      <td colSpan={span}>{renderExpanded(row)}</td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          ) : (
            <tr>
              <td colSpan={span}>
                <EmptyState title={emptyTitle} description={emptyDescription} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
  if (!size) return table;
  const first = total ? (current - 1) * size + 1 : 0;
  const last = Math.min(current * size, total);
  return (
    <div className="lv-table-paged">
      {table}
      <div className="lv-table-pager">
        <span className="lv-table-count lv-tabular">
          {total ? `${total}件中 ${first}〜${last}件目` : '0件'}
        </span>
        <Pagination
          page={current}
          totalPages={totalPages}
          onPageChange={setPage}
          variant={paginationVariant}
          pageSize={size}
          pageSizeOptions={pageSizeOptions}
          onPageSizeChange={(n) => {
            onPageSizeChange?.(n);
            if (current !== 1) setPage(1);
          }}
        />
      </div>
    </div>
  );
}

export type DescriptionItem = {
  /** 項目名。 */
  label: string;
  value: ReactNode;
  /** 値が数値・ID・日時・コードのとき true。等幅で桁をそろえます。単位は value の中で `.lv-mono` の外に置けないので、単位のある値は false のまま `<span className="lv-mono">` で包みます。 */
  mono?: boolean;
  /** layout="stack" で段を組むとき、行の幅いっぱいに広げます（メモなど長い値）。 */
  wide?: boolean;
};
/** 「項目名：値」の一覧。`<dl>` の意味を保ちます。layout="row" は項目名の列と値を横に並べ、幅が足りないと値を項目名の下に回します。 */
export function DescriptionList({
  items,
  layout = 'row',
  columns = 1,
  labelWidth,
  className,
  style,
  ...props
}: HTMLAttributes<HTMLDListElement> & {
  items: DescriptionItem[];
  /** 'row' は詳細や確認の画面向けに項目名と値を横に並べ、'stack' は項目名の下に値を置きます。 */
  layout?: 'row' | 'stack';
  /** layout="stack" のときの段の数。幅が足りないと段を減らします。 */
  columns?: 1 | 2 | 3;
  /** layout="row" の項目名の列の幅。既定は '8em'。どの行も同じ幅になります。 */
  labelWidth?: string;
}) {
  return (
    <dl
      {...props}
      className={cx('lv-dl', className)}
      data-layout={layout}
      style={
        {
          ...style,
          '--dl-columns': columns,
          ...(labelWidth && { '--dl-label-width': labelWidth }),
        } as CSSProperties
      }
    >
      {items.map((item, i) => (
        <div key={i} className="lv-dl-item" data-wide={item.wide || undefined}>
          <dt className="lv-dl-label">{item.label}</dt>
          <dd className={cx('lv-dl-value', item.mono && 'lv-mono')}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
