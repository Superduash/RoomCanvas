import { useState } from 'react';
import { usePasswordStrength } from '../../hooks/usePasswordStrength';

const STRENGTH_COLORS = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-success', 'bg-success'];
const STRENGTH_TEXT_COLORS = ['text-danger', 'text-danger', 'text-warning', 'text-success', 'text-success'];

export function PasswordField({ value, onChange, label = 'Password', placeholder, showStrength = false, autoComplete = 'new-password', id = 'password', error }: { value: string; onChange: (val: string) => void; label?: string; placeholder?: string; showStrength?: boolean; autoComplete?: string; id?: string; error?: string; }) {
  const [visible, setVisible] = useState(false);
  const strength = usePasswordStrength(value);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-text-primary select-none cursor-default">{label}</label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
          minLength={8}
          className={`h-11 w-full rounded-xl border bg-surface-raised pl-4 pr-12 text-[15px] text-text-primary shadow-xs placeholder:text-text-tertiary/60 transition-all duration-base ease-out focus:outline-none focus:shadow-focus disabled:opacity-50 cursor-text select-text ${error ? 'border-danger bg-danger-subtle focus:border-danger focus:shadow-focus-danger' : 'border-border hover:border-border-strong focus:border-accent'}`}
          aria-describedby={showStrength ? `${id}-strength` : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-10 flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-alt rounded-md transition-colors focus-visible:outline-none focus-visible:shadow-focus cursor-pointer select-none"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.5 5.1A10.6 10.6 0 0 1 12 5c5 0 9 4 10 7-.4 1.1-1.1 2.3-2.1 3.4M6.1 6.6C4 8 2.5 10 2 12c1 3 5 7 10 7 1.3 0 2.5-.2 3.6-.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" /></svg>
          )}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div id={`${id}-strength`} className="flex flex-col gap-1 mt-1.5 select-none cursor-default">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-text-secondary">Password strength</span>
            <span className={`text-[12px] font-semibold ${STRENGTH_TEXT_COLORS[strength.score]}`}>
              {strength.label}
            </span>
          </div>
          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ease-out ${STRENGTH_COLORS[strength.score]}`}
              style={{ width: `${Math.max(5, strength.percent)}%` }}
            />
          </div>
        </div>
      )}
      <div className="min-h-[20px]">
        {error && (
          <p id={`${id}-error`} className="text-[13px] text-danger leading-tight" role="alert">{error}</p>
        )}
      </div>
    </div>
  );
}
