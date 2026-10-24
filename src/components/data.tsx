import { useId, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react';
import { cx } from './system';
import { EmptyState, Skeleton } from './primitives';

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
      className={cx('k-sparkline', `k-sparkline--${color}`)}
      viewBox="0 0 200 50"
      // Stretch to the box: the stroke stays 2px (non-scaling), so only the data is scaled.
      preserveAspectRatio="none"
      role="img"
      aria-labelledby={id}
    >
      <title id={id}>{label}</title>
      <path d="M0 45H200M0 25H200M0 5H200" className="k-chart-grid" />
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
  value: string;
  unit?: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  values?: number[];
  code?: string;
}) {
  return (
    <section className="k-metric" aria-label={label}>
      <div className="k-metric-top">
        <span>{label}</span>
        {code && <span className="k-metric-code">{code}</span>}
      </div>
      <div className="k-metric-value">
        {value}
        <span>{unit}</span>
      </div>
      <div
        className={cx(
          'k-metric-change',
          trend === 'up' && 'k-text-success',
          trend === 'down' && 'k-text-danger',
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
      className="k-meter"
      role="meter"
      aria-label={label}
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={safeMax}
    >
      <div className="k-meter-face" aria-hidden>
        <div className="k-meter-ticks" />
        <div className="k-meter-hand" style={{ transform: `rotate(${degrees}deg)` }} />
        <span className="k-meter-hub" />
      </div>
      <div className="k-meter-reading" aria-hidden>
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
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right';
  width?: string;
};
export type TableSort = { key: string; direction: 'asc' | 'desc' } | null;
export type DataTableProps<T> = {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  caption: string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  sorting?: TableSort;
  onSortingChange?: (sort: TableSort) => void;
};
/** ネイティブtableの意味論を維持。ソート・選択・空/読込状態を備えます。 */
export function DataTable<T>({
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
}: DataTableProps<T>) {
  const [internalSort, setInternalSort] = useState<TableSort>(null);
  const sort = sorting === undefined ? internalSort : sorting;
  const setSort = (value: TableSort) => {
    setInternalSort(value);
    onSortingChange?.(value);
  };
  const [internal, setInternal] = useState<string[]>([]);
  const selection = selectedIds ?? internal;
  const select = (ids: string[]) => {
    setInternal(ids);
    onSelectionChange?.(ids);
  };
  const visibleIds = rows.map(getRowId);
  const all = rows.length > 0 && visibleIds.every((id) => selection.includes(id));
  const some = visibleIds.some((id) => selection.includes(id));
  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key);
    if (!sort || !col?.sortValue) return rows;
    const value = col.sortValue;
    return [...rows].sort((a, b) => {
      const av = value(a),
        bv = value(b);
      return (
        (typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), 'ja', { numeric: true })) *
        (sort.direction === 'asc' ? 1 : -1)
      );
    });
  }, [rows, columns, sort]);
  return (
    <div
      className="k-table-wrap"
      role="region"
      aria-label={`${caption}（横スクロール対応）`}
      tabIndex={0}
    >
      <table className="k-table">
        <caption className="k-sr-only">{caption}</caption>
        <thead>
          <tr>
            {selectable && (
              <th scope="col" className="k-table-select">
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
                  disabled={loading || !rows.length}
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
                    className="k-table-sort"
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
                <span className="k-sr-only">操作</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 4 }, (_, i) => (
              <tr key={i}>
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
          ) : sorted.length ? (
            sorted.map((row) => {
              const id = getRowId(row);
              return (
                <tr key={id} data-selected={selection.includes(id) || undefined}>
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
                        className="k-table-detail"
                        aria-label={`${id} の詳細を開く`}
                        onClick={() => onRowClick(row)}
                      >
                        詳細
                        <ChevronRight size={14} aria-hidden />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0) + (onRowClick ? 1 : 0)}>
                <EmptyState title={emptyTitle} description={emptyDescription} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
