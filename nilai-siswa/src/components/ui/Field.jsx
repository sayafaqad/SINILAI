import { ChevronDown } from 'lucide-react';
import { cx } from '../../lib/format';

const CONTROL = [
  'w-full rounded-sm border bg-card px-3 text-body-md text-foreground transition-colors',
  'placeholder:text-muted-foreground/70',
  'focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/35',
  'disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground',
].join(' ');

export function Field({ label, htmlFor, required, helper, error, children, className }) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label ? (
        <label htmlFor={htmlFor} className="text-label-md text-foreground">
          {label}
          {required ? (
            <span className="ml-1 text-danger" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-body-sm text-danger" role="alert">
          {error}
        </p>
      ) : helper ? (
        <p className="text-body-sm text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ invalid, className, ...rest }) {
  return (
    <input
      className={cx(CONTROL, 'h-touch sm:h-control', invalid ? 'border-danger' : 'border-input', className)}
      aria-invalid={invalid ? 'true' : undefined}
      {...rest}
    />
  );
}

export function Select({ invalid, className, children, ...rest }) {
  return (
    <div className="relative">
      <select
        className={cx(
          CONTROL,
          'h-touch appearance-none pr-9 sm:h-control',
          invalid ? 'border-danger' : 'border-input',
          className,
        )}
        aria-invalid={invalid ? 'true' : undefined}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
}

export function TextArea({ invalid, className, rows = 3, ...rest }) {
  return (
    <textarea
      rows={rows}
      className={cx(CONTROL, 'py-2 leading-relaxed', invalid ? 'border-danger' : 'border-input', className)}
      aria-invalid={invalid ? 'true' : undefined}
      {...rest}
    />
  );
}

export function SearchInput({ value, onChange, placeholder = 'Cari…', label, className }) {
  return (
    <div className={cx('relative', className)}>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label || placeholder}
        className={cx(CONTROL, 'h-touch border-input pl-9 sm:h-control')}
      />
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    </div>
  );
}
