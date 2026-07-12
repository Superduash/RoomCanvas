import { cn } from '../../lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer group">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-text-primary group-hover:text-text-primary transition-colors">
          {label}
        </span>
        {description && (
          <span className="text-xs text-text-tertiary">{description}</span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
          'transition-colors duration-base ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          checked ? 'bg-accent' : 'bg-surface-alt border border-border-strong',
        )}
      >
        <span className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm',
          'transition-transform duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
          checked ? 'translate-x-5' : 'translate-x-0',
        )} />
      </button>
    </label>
  );
}
