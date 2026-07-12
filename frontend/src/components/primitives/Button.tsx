import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';
import { Tooltip } from './Tooltip';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'icon-sm' | 'icon' | 'icon-lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  asChild?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: [
    'bg-accent text-white shadow-xs',
    'hover:bg-accent-hover hover:shadow-md hover:-translate-y-[1px]',
    'active:bg-accent-hover active:shadow-xs active:translate-y-0 active:scale-[0.98]',
    'disabled:opacity-50 disabled:hover:bg-accent disabled:hover:shadow-xs disabled:hover:translate-y-0 disabled:active:scale-100',
  ].join(' '),
  secondary: [
    'bg-surface-raised text-text-primary border border-border-strong shadow-xs',
    'hover:border-text-tertiary/40 hover:bg-surface-raised hover:shadow-sm hover:-translate-y-[1px]',
    'active:bg-surface-alt active:border-border-strong active:translate-y-0 active:scale-[0.98]',
    'disabled:opacity-50 disabled:hover:bg-surface-raised disabled:hover:border-border-strong disabled:hover:translate-y-0',
  ].join(' '),
  ghost: [
    'bg-transparent text-text-secondary',
    'hover:bg-surface-alt hover:text-text-primary',
    'active:bg-border active:scale-[0.98]',
    'disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-text-secondary',
  ].join(' '),
  outline: [
    'bg-transparent text-accent border border-accent/30',
    'hover:bg-accent-subtle hover:border-accent/40',
    'active:bg-accent-subtle active:border-accent/50 active:scale-[0.98]',
    'disabled:opacity-50',
  ].join(' '),
  destructive: [
    'bg-transparent text-danger border border-danger/25',
    'hover:bg-danger-subtle hover:border-danger/35',
    'active:bg-danger-subtle active:border-danger/40 active:scale-[0.98]',
    'disabled:opacity-50',
  ].join(' '),
};

const sizeClasses: Record<Size, string> = {
  xs:      'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  sm:      'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md:      'h-9 px-4 text-sm gap-2 rounded-lg',
  lg:      'h-12 px-7 text-[15px] font-semibold gap-2 rounded-xl',
  'icon-sm':'h-7 w-7 p-0 rounded-md flex-shrink-0',
  icon:    'h-9 w-9 p-0 rounded-lg flex-shrink-0',
  'icon-lg':'h-10 w-10 p-0 rounded-lg flex-shrink-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps & HTMLMotionProps<'button'>>(
  ({ variant = 'primary', size = 'md', loading, icon, iconRight, asChild, disabled, className, children, title, ...props }, ref) => {
    const isDisabled = disabled || loading;
    const isIcon = size === 'icon' || size === 'icon-sm' || size === 'icon-lg';

    const classes = cn(
      'inline-flex items-center justify-center font-medium',
      'transition-all duration-base ease-out cursor-pointer select-none',
      'focus-visible:outline-none focus-visible:shadow-focus',
      'disabled:cursor-not-allowed',
      variantClasses[variant],
      sizeClasses[size],
      className,
    );

    if (asChild) {
      return (
        <Slot ref={ref} className={classes} aria-disabled={isDisabled} {...(props as any)}>
          {children}
        </Slot>
      );
    }

    const buttonElement = (
      <motion.button
        ref={ref}
        type="button"
        whileTap={isDisabled ? undefined : { scale: 0.98 }}
        transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
        aria-disabled={isDisabled}
        disabled={isDisabled}
        className={classes}
        title={!isIcon ? title : undefined}
        {...props}
      >
        {loading ? (
          <Loader2 className={cn('animate-spin flex-shrink-0', isIcon ? 'h-4 w-4' : 'h-3.5 w-3.5')} aria-hidden="true" />
        ) : icon ? (
          <span className="flex-shrink-0 flex items-center" aria-hidden="true">{icon}</span>
        ) : null}
        {!isIcon && children && <span>{children}</span>}
        {!isIcon && iconRight && !loading && (
          <span className="flex-shrink-0 flex items-center" aria-hidden="true">{iconRight}</span>
        )}
      </motion.button>
    );

    if (isIcon && title) {
      return (
        <Tooltip content={title}>
          {buttonElement}
        </Tooltip>
      );
    }

    return buttonElement;
  }
);
Button.displayName = 'Button';
