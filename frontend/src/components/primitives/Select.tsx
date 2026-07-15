// Select.tsx — custom styled select using Radix UI Select
import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export function Select({ value, onValueChange, placeholder, label, hint, error, disabled, children }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-text-primary">{label}</label>}
      <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <RadixSelect.Trigger className={cn(
          'flex h-11 w-full min-w-0 items-center justify-between rounded-xl border bg-surface-raised px-4',
          'text-[15px] text-text-primary shadow-xs cursor-pointer',
          'transition-all duration-base ease-out',
          'focus:outline-none focus:border-accent focus:shadow-focus',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'hover:border-border-strong',
          error ? 'border-danger' : 'border-border',
          '[&[data-placeholder]]:text-text-tertiary/60',
          // Hide model badges in the closed trigger — they only show in the open list
          '[&_.select-badges]:hidden',
        )}>
          <span className="truncate min-w-0 flex-1 text-left">
            <RadixSelect.Value placeholder={placeholder} />
          </span>
          <RadixSelect.Icon className="flex-shrink-0 ml-2">
            <ChevronDown className="h-4 w-4 text-text-tertiary" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content 
            position="popper"
            className={cn(
            'z-[var(--z-dropdown)] overflow-hidden rounded-xl border border-border',
            'bg-surface-raised shadow-lg',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'max-h-[200px] w-[var(--radix-select-trigger-width)] min-w-[200px]'
          )}>
            <RadixSelect.Viewport className="p-1.5 max-h-[190px] overflow-y-auto">
              {children}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {hint && !error && <p className="text-xs text-text-tertiary">{hint}</p>}
      {error && <p className="text-xs text-danger flex items-center gap-1">{error}</p>}
    </div>
  );
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <RadixSelect.Item value={value} className={cn(
      'relative flex cursor-pointer select-none items-center rounded-lg px-4 py-2.5',
      'text-sm text-text-primary outline-none',
      'data-[highlighted]:bg-surface-alt data-[highlighted]:text-text-primary',
      'data-[state=checked]:text-accent data-[state=checked]:font-medium',
    )}>
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator className="absolute right-3">
        <Check className="h-4 w-4" />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  );
}

