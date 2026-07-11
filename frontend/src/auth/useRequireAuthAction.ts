import { useAuth } from './AuthProvider';
import { useAuthModalStore } from './authModalStore';

export function useRequireAuthAction() {
  const { isAuthenticated } = useAuth();
  const openModal = useAuthModalStore((s) => s.open);

  return function requireAuth(action: () => void, pendingAction?: { type: string; payload: any }) {
    if (isAuthenticated) {
      action();
      return;
    }
    if (pendingAction) {
      useAuthModalStore.getState().setPendingAction(pendingAction);
    }
    openModal();
  };
}
