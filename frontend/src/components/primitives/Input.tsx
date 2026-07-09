import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

/* ── Input ─────────────────────────────────────────────── */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, label, hint, leftIcon, rightElement, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-primary leading-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 flex items-center text-text-tertiary pointer-events-none" aria-hidden="true">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'h-10 w-full rounded-lg border bg-surface px-3 text-sm text-text-primary',
              'placeholder:text-text-tertiary',
              'transition-all duration-fast',
              'focus:outline-none focus:border-accent focus:shadow-focus',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-alt',
              error ? 'border-danger bg-danger-subtle focus:shadow-focus-danger' : 'border-border hover:border-border-strong',
              leftIcon && 'pl-9',
              rightElement && 'pr-10',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {rightElement && (
            <span className="absolute right-3 flex items-center" aria-hidden="true">
              {rightElement}
            </span>
          )}
        </div>
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-text-tertiary leading-relaxed">{hint}</p>
        )}
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-danger leading-relaxed" role="alert">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

/* ── Textarea ───────────────────────────────────────────── */
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, label, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-primary leading-none">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-text-primary',
            'placeholder:text-text-tertiary resize-none',
            'transition-all duration-fast',
            'focus:outline-none focus:border-accent focus:shadow-focus',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-alt',
            error ? 'border-danger bg-danger-subtle focus:shadow-focus-danger' : 'border-border hover:border-border-strong',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-text-tertiary leading-relaxed">{hint}</p>
        )}
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-danger leading-relaxed" role="alert">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
