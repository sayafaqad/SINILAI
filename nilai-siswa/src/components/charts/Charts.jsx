import { cx, formatNumber, formatScore, EMPTY } from '../../lib/format';
import { EmptyState } from '../ui/Bits';
import { Inbox } from 'lucide-react';

/**
 * Sorted horizontal bars built from CSS (no chart library). Category labels use
 * the axis ink, values use tabular numerals at the bar end, so the chart stays
 * readable in a static screenshot.
 */
export function HorizontalBarChart({ items, unit = '', emptyTitle, emptyDescription, ariaLabel }) {
  const visible = items.filter((item) => item.value !== null && item.value !== undefined);
  if (visible.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title={emptyTitle || 'Belum ada data untuk digambarkan'}
        description={emptyDescription}
        className="py-10"
      />
    );
  }

  const sorted = [...visible].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((item) => item.value), 1);

  return (
    <div data-component="chart-horizontal-bars">
      <ul className="flex flex-col gap-3" aria-label={ariaLabel}>
        {sorted.map((item) => (
          <li key={item.key || item.label} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3">
            <span className="truncate text-body-sm text-chart-axis" title={item.label}>
              {item.label}
            </span>
            <span className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <span
                className={cx('block h-full rounded-full', item.tone || 'bg-chart-1')}
                style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
              />
            </span>
            <span className="tnum w-16 text-right text-numeric-md">
              {formatScore(item.value)}
              {unit ? <span className="ml-0.5 text-body-sm text-muted-foreground">{unit}</span> : null}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-body-sm text-muted-foreground">
        Skala 0–100 · {sorted.length} kategori dengan nilai.
      </p>
    </div>
  );
}

const BANDS = [
  { key: 'A', label: 'A', className: 'bg-predikat-a' },
  { key: 'B', label: 'B', className: 'bg-predikat-b' },
  { key: 'C', label: 'C', className: 'bg-predikat-c' },
  { key: 'D', label: 'D', className: 'bg-predikat-d' },
  { key: 'none', label: 'Belum ada nilai', className: 'bg-chart-4' },
];

/** Part-to-whole: how Nilai Akhir spread across predikat bands. */
export function PredikatDistribution({ counts, total }) {
  const sum = total ?? BANDS.reduce((acc, band) => acc + (counts[band.key] || 0), 0);
  if (!sum) {
    return (
      <EmptyState
        icon={Inbox}
        title="Belum ada nilai akhir"
        description="Distribusi predikat muncul setelah nilai diinput pada menu Input Nilai."
        className="py-10"
      />
    );
  }

  return (
    <div data-component="chart-predikat-distribution">
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {BANDS.filter((band) => counts[band.key] > 0).map((band) => (
          <span
            key={band.key}
            className={band.className}
            style={{ width: `${(counts[band.key] / sum) * 100}%` }}
          />
        ))}
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {BANDS.map((band) => (
          <li key={band.key} className="flex items-center justify-between gap-3 text-body-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className={cx('h-2.5 w-2.5 rounded-full', band.className)} aria-hidden="true" />
              {band.key === 'none' ? band.label : `Predikat ${band.label}`}
            </span>
            <span className="tnum text-numeric-md">
              {formatNumber(counts[band.key] || 0)}
              <span className="ml-1 text-body-sm text-muted-foreground">
                ({formatNumber(sum ? ((counts[band.key] || 0) / sum) * 100 : 0)}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-body-sm text-muted-foreground">
        Total {formatNumber(sum)} nilai akhir berdasarkan Nilai Akhir tiap siswa per mata pelajaran.
      </p>
    </div>
  );
}

/** Completeness per class — reuses the progress fill tokens. */
export function CompletenessList({ items, emptyTitle, emptyDescription }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title={emptyTitle || 'Belum ada kelas'}
        description={emptyDescription}
      />
    );
  }
  return (
    <ul className="flex flex-col gap-4" data-component="chart-completeness">
      {items.map((item) => {
        const value = item.completeness === null ? 0 : item.completeness;
        const complete = value >= 100;
        return (
          <li key={item.classId}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-body-md font-medium">
                {item.className}
                <span className="ml-2 text-body-sm text-muted-foreground">
                  {formatNumber(item.studentCount)} siswa
                </span>
              </span>
              <span className="tnum text-numeric-md">
                {item.completeness === null ? EMPTY : `${value}%`}
              </span>
            </div>
            <div
              className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={value}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Kelengkapan nilai kelas ${item.className}`}
            >
              <div
                className={cx('h-full rounded-full', complete ? 'bg-success' : 'bg-primary')}
                style={{ width: `${value}%` }}
              />
            </div>
            <p className="mt-1 text-body-sm text-muted-foreground">
              {formatNumber(item.filled)} dari {formatNumber(item.total)} sel nilai terisi · rata-rata{' '}
              {formatScore(item.average)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
