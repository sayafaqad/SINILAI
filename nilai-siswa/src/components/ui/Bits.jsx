import { HardDrive } from 'lucide-react';
import { cx } from '../../lib/format';

const BADGE_TONES = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-accent text-accent-foreground',
  info: 'bg-info-surface text-info',
  success: 'bg-success-surface text-success',
  warning: 'bg-warning-surface text-warning',
  danger: 'bg-danger-surface text-danger',
};

export function Badge({ tone = 'neutral', children, className }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-label-caps uppercase',
        BADGE_TONES[tone] || BADGE_TONES.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}

const PREDIKAT_TONES = {
  A: 'bg-predikat-a-surface text-predikat-a',
  B: 'bg-predikat-b-surface text-predikat-b',
  C: 'bg-predikat-c-surface text-predikat-c',
  D: 'bg-predikat-d-surface text-predikat-d',
};

export function PredikatBadge({ predikat }) {
  if (!predikat) {
    return (
      <span
        className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-label-caps uppercase text-muted-foreground"
        title="Belum ada nilai"
      >
        —
      </span>
    );
  }
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-label-caps uppercase',
        PREDIKAT_TONES[predikat],
      )}
    >
      {predikat}
    </span>
  );
}

export function ProgressBar({ value, label, tone, className }) {
  const safe = typeof value === 'number' && !Number.isNaN(value) ? Math.min(100, Math.max(0, value)) : 0;
  const complete = safe >= 100;
  const fillTone = tone || (complete ? 'bg-success' : 'bg-primary');
  return (
    <div className={className}>
      {label ? <p className="mb-1.5 text-body-sm text-muted-foreground">{label}</p> : null}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Kelengkapan'}
      >
        <div className={cx('h-full rounded-full transition-[width]', fillTone)} style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}

export function SegmentedControl({ options, value, onChange, label }) {
  return (
    <div
      className="inline-flex flex-wrap gap-0.5 rounded-md bg-muted p-0.5"
      role="group"
      aria-label={label || 'Pilihan'}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cx(
              'min-h-touch rounded-sm px-3.5 text-label-md transition-colors sm:min-h-control',
              active
                ? 'bg-card font-medium text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function FilterChip({ active, onClick, children, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-3 text-label-md transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {children}
      {typeof count === 'number' ? (
        <span className={cx('tnum text-[11px]', active ? 'text-primary-100' : 'text-muted-foreground')}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cx('flex flex-col items-center px-8 py-12 text-center', className)}
      data-component="empty-state"
    >
      {Icon ? (
        <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-primary">
          <Icon size={22} aria-hidden="true" />
        </span>
      ) : null}
      <h3 className="mt-4 text-headline-md">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-[46ch] text-body-md text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** Always-visible honesty notice: this app is local-only, with no login. */
export function LocalModeBanner({ className }) {
  return (
    <p
      className={cx(
        'flex items-start gap-2.5 rounded-md bg-info-surface px-4 py-2.5 text-body-sm text-info',
        className,
      )}
      data-component="local-mode-banner"
    >
      <HardDrive size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>
        <strong className="font-medium">Data tersimpan di perangkat ini</strong> — mode lokal, tanpa
        login. Tidak ada data yang dikirim ke internet.
      </span>
    </p>
  );
}

export function TableShell({ children, className }) {
  return (
    <div className={cx('table-scroll rounded-lg border border-border bg-card', className)}>{children}</div>
  );
}

/**
 * Table head cell. Nothing here is frozen or sticky: every column scrolls with
 * the table, on phones as well as on the desktop layout.
 */
export function Th({ children, className, align = 'left', ...rest }) {
  return (
    <th
      scope="col"
      className={cx(
        'h-row-dense whitespace-nowrap bg-muted px-3 text-label-caps uppercase text-muted-foreground',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, align = 'left', muted, ...rest }) {
  return (
    <td
      className={cx(
        'h-row-dense px-3 text-body-md',
        align === 'right' ? 'tnum text-right' : align === 'center' ? 'text-center' : 'text-left',
        muted && 'text-muted-foreground',
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  );
}
