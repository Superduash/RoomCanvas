import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Loader2 } from 'lucide-react';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingBlock: 'var(--space-9)' }}>
        <Loader2 size={28} color="var(--accent)" className="animate-spin" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (profile && !profile.profile_completed && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }
  
  return <>{children}</>;
}
