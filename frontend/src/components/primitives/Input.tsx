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
          <label htmlFor={inputId} className="text-sm font-medium text-text-primary leading-none select-none cursor-default">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-4 flex items-center text-text-tertiary pointer-events-none" aria-hidden="true">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'h-11 w-full rounded-xl border bg-surface-raised px-4 text-[15px] text-text-primary shadow-xs cursor-text select-text',
              'placeholder:text-text-tertiary',
              'transition-all duration-base ease-out',
              'focus:outline-none focus:border-accent focus:shadow-focus',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-alt',
              error ? 'border-danger bg-danger-subtle focus:border-danger focus:shadow-focus-danger' : 'border-border hover:border-border-strong',
              leftIcon && 'pl-11',
              rightElement && 'pr-11',
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
        <div className="min-h-[20px]">
          {error ? (
            <p id={`${inputId}-error`} className="text-[13px] text-danger leading-tight select-text" role="alert">{error}</p>
          ) : hint ? (
            <p id={`${inputId}-hint`} className="text-[13px] text-text-tertiary leading-tight select-none">{hint}</p>
          ) : null}
        </div>
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
  maxLength?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, label, hint, maxLength, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const charCount = (props.value as string)?.length ?? 0;
    
    return (
      <div className="flex flex-col gap-1.5">
        {(label || maxLength) && (
          <div className="flex items-center justify-between">
            {label && (
              <label htmlFor={inputId} className="text-sm font-medium text-text-primary leading-none select-none cursor-default">
                {label}
              </label>
            )}
            {maxLength && (
              <span className={cn('text-xs', charCount > maxLength * 0.9 ? 'text-warning' : 'text-text-tertiary')}>
                {charCount}/{maxLength}
              </span>
            )}
          </div>
        )}
        <textarea
          ref={ref}
          id={inputId}
          maxLength={maxLength}
          className={cn(
            'w-full rounded-xl border bg-surface-raised px-4 py-3 text-[15px] text-text-primary cursor-text select-text shadow-xs',
            'placeholder:text-text-tertiary resize-none',
            'transition-all duration-base ease-out',
            'focus:outline-none focus:border-accent focus:shadow-focus',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-danger' : 'border-border hover:border-border-strong',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        <div className="min-h-[20px]">
          {error ? (
            <p id={`${inputId}-error`} className="text-[13px] text-danger leading-tight select-text" role="alert">{error}</p>
          ) : hint ? (
            <p id={`${inputId}-hint`} className="text-[13px] text-text-tertiary leading-tight select-none">{hint}</p>
          ) : null}
        </div>
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
