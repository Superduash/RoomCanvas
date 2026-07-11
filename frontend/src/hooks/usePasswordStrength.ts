import { useMemo } from 'react';

const LEVELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];

export function usePasswordStrength(password: string) {
  return useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    const clamped = Math.min(score, 4);
    return {
      score: clamped,               // 0–4
      label: LEVELS[clamped],
      percent: (clamped / 4) * 100,
      isAcceptable: password.length >= 8 && clamped >= 2,
    };
  }, [password]);
}
