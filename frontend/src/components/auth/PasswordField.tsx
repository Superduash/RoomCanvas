import { useState } from 'react';
import { usePasswordStrength } from '../../hooks/usePasswordStrength';
import styles from './PasswordField.module.css';

const STRENGTH_COLORS = ['var(--error)', 'var(--error)', 'var(--warning)', 'var(--success)', 'var(--success)'];

export function PasswordField({ value, onChange, label = 'Password', showStrength = false, autoComplete = 'new-password', id = 'password' }: { value: string; onChange: (val: string) => void; label?: string; showStrength?: boolean; autoComplete?: string; id?: string; }) {
  const [visible, setVisible] = useState(false);
  const strength = usePasswordStrength(value);

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <div className={styles.inputWrap}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          minLength={8}
          className={styles.input}
          aria-describedby={showStrength ? `${id}-strength` : undefined}
        />
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.5 5.1A10.6 10.6 0 0 1 12 5c5 0 9 4 10 7-.4 1.1-1.1 2.3-2.1 3.4M6.1 6.6C4 8 2.5 10 2 12c1 3 5 7 10 7 1.3 0 2.5-.2 3.6-.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.5" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" /></svg>
          )}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div id={`${id}-strength`} className={styles.strength}>
          <div className={styles.strengthTrack}>
            <div
              className={styles.strengthFill}
              style={{ width: `${strength.percent}%`, background: STRENGTH_COLORS[strength.score] }}
            />
          </div>
          <span className={styles.strengthLabel} style={{ color: STRENGTH_COLORS[strength.score] }}>
            {strength.label}
          </span>
        </div>
      )}
    </div>
  );
}
