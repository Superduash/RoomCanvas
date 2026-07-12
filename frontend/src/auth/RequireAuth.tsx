import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Loader2, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '../components/primitives/Button';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { authState, syncError, profile } = useAuth();
  const location = useLocation();

  if (authState === 'initializing' || (authState === 'syncing' && !profile && !syncError)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingBlock: 'var(--space-9)' }}>
        <Loader2 size={28} color="var(--accent)" className="animate-spin" />
      </div>
    );
  }

  if (syncError && !profile) {
    const isOffline = syncError.toLowerCase().includes('offline') || syncError.toLowerCase().includes('network');
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center gap-4 mt-20">
        {isOffline ? (
          <WifiOff size={40} className="text-text-tertiary" />
        ) : (
          <RefreshCw size={40} className="text-danger" />
        )}
        <div className="space-y-1">
          <h2 className="text-lg font-medium">{isOffline ? 'You are offline' : 'Sync Error'}</h2>
          <p className="text-sm text-text-secondary">{syncError}</p>
        </div>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Retry
        </Button>
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
