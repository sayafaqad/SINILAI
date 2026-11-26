import { cx } from '../../lib/format';

export function Card({ className, children, ...rest }) {
  return (
    <section className={cx('rounded-lg border border-border bg-card', className)} {...rest}>
      {children}
    </section>
  );
}

export function CardHeader({ title, description, action, className }) {
  return (
    <header
      className={cx(
        'flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-headline-sm">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-[65ch] text-body-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2 no-print">{action}</div> : null}
    </header>
  );
}

export function StatCard({ label, value, hint, icon: Icon, valueClassName }) {
  return (
    <article
      className="rounded-lg border border-border bg-card p-4"
      data-component="stat-card"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-label-caps uppercase text-muted-foreground">{label}</p>
        {Icon ? <Icon size={18} className="text-primary-400" aria-hidden="true" /> : null}
      </div>
      <p className={cx('tnum mt-3 text-numeric-lg', valueClassName)}>{value}</p>
      {hint ? <p className="mt-1.5 text-body-sm text-muted-foreground">{hint}</p> : null}
    </article>
  );
}
