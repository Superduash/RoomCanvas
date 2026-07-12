import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Loader2 } from 'lucide-react';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { authState } = useAuth();
  const location = useLocation();

  if (authState === 'initializing' || authState === 'syncing') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingBlock: 'var(--space-9)' }}>
        <Loader2 size={28} color="var(--accent)" className="animate-spin" />
      </div>
    );
  }

  if (authState === 'guest') {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (authState === 'onboarding' && location.pathname !== '/setup') {
    return <Navigate to="/setup" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
