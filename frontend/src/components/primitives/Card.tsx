import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  selected?: boolean;
  elevated?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ interactive, selected, elevated, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border bg-surface transition-all duration-base',
        elevated ? 'shadow-md' : 'shadow-xs',
        selected
          ? 'border-accent ring-2 ring-accent/20 shadow-sm'
          : 'border-border',
        interactive && [
          'cursor-pointer',
          'hover:border-border-strong hover:shadow-md hover:-translate-y-0.5',
          'focus-visible:outline-none focus-visible:shadow-focus',
          'active:translate-y-0 active:shadow-xs',
        ],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
Card.displayName = 'Card';
