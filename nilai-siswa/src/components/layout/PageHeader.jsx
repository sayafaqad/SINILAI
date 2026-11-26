import { cx } from '../../lib/format';

export function PageHeader({ title, description, action, children }) {
  return (
    <header className="mb-6 flex flex-col gap-4" data-component="page-header">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-headline-lg">{title}</h1>
          {description ? (
            <p className="mt-1.5 max-w-[72ch] text-body-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="flex flex-wrap items-center gap-2 no-print">{action}</div> : null}
      </div>
      {children}
    </header>
  );
}

/** Persistent, visible filter context — users never have to remember selections. */
export function FilterBar({ children, className }) {
  return (
    <div
      className={cx(
        'flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card px-4 py-3 no-print',
        className,
      )}
      data-component="filter-bar"
    >
      {children}
    </div>
  );
}

export function FilterField({ label, children, className }) {
  return (
    <div className={cx('flex min-w-0 flex-col gap-1.5', className)}>
      <span className="text-label-caps uppercase text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
