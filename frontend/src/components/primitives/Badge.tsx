import { cn } from '../../lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'outline';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default:  'bg-surface-alt text-text-secondary border border-border',
  success:  'bg-success-subtle text-success border border-success/20',
  warning:  'bg-warning-subtle text-warning border border-warning/20',
  danger:   'bg-danger-subtle  text-danger  border border-danger/20',
  info:     'bg-info-subtle    text-info    border border-info/20',
  accent:   'bg-accent-subtle  text-accent  border border-accent/20',
  outline:  'bg-transparent    text-text-secondary border border-border',
};

const dotVariants: Record<BadgeVariant, string> = {
  default: 'bg-text-tertiary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger:  'bg-danger',
  info:    'bg-info',
  accent:  'bg-accent',
  outline: 'bg-text-tertiary',
};

export function Badge({ variant = 'default', children, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 h-7 text-[13px] font-semibold leading-none whitespace-nowrap',
        badgeVariants[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', dotVariants[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

interface ChipProps {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function Chip({ children, selected, onClick, className, disabled }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium',
        'transition-all duration-fast focus-visible:outline-none focus-visible:shadow-focus',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        selected
          ? 'border-accent bg-accent-subtle text-accent shadow-sm'
          : 'border-border bg-surface text-text-secondary hover:border-border-strong hover:bg-surface-alt hover:text-text-primary',
        className
      )}
    >
      {children}
    </button>
  );
}
