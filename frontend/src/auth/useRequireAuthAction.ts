import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { useAuthModalStore } from './authModalStore';

export function useRequireAuthAction() {
  const { authState } = useAuth();
  const openModal = useAuthModalStore((s) => s.open);
  const navigate = useNavigate();
  const location = useLocation();

  return function requireAuth(action: () => void, pendingAction?: { type: string; payload: any }) {
    if (authState === 'authenticated') {
      action();
      return;
    }
    if (authState === 'onboarding') {
      navigate('/setup', { state: { from: location } });
      return;
    }
    if (pendingAction) {
      useAuthModalStore.getState().setPendingAction(pendingAction);
    }
    openModal();
  };
}
