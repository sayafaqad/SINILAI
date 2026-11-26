import { cx } from '../../lib/format';

const VARIANTS = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-700 active:bg-primary-800',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
  ghost: 'bg-transparent text-foreground hover:bg-accent',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  subtle: 'bg-card text-foreground border border-border hover:border-input hover:bg-accent',
};

const SIZES = {
  md: 'px-4 text-label-md',
  sm: 'px-3 text-body-sm',
};

/**
 * Buttons keep a 36px desktop height and grow to the 44px touch target on
 * small/coarse pointers, so a staff-room tablet stays usable.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  className,
  type = 'button',
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex min-h-touch items-center justify-center gap-2 rounded-sm font-medium transition-colors sm:min-h-control',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size] || SIZES.md,
        className,
      )}
      {...rest}
    >
      {Icon ? <Icon size={17} aria-hidden="true" /> : null}
      {children}
      {IconRight ? <IconRight size={17} aria-hidden="true" /> : null}
    </button>
  );
}

export function IconButton({ label, icon: Icon, className, tone = 'default', ...rest }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cx(
        'grid h-touch w-touch shrink-0 place-items-center rounded-sm text-muted-foreground transition-colors sm:h-8 sm:w-8',
        tone === 'danger' ? 'hover:bg-danger-surface hover:text-danger' : 'hover:bg-accent hover:text-accent-foreground',
        className,
      )}
      {...rest}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}
