import { create } from 'zustand';

interface PendingAction {
  type: string;
  payload: any;
}

interface AuthModalState {
  isOpen: boolean;
  pendingAction: PendingAction | null;
  open: () => void;
  close: () => void;
  setPendingAction: (action: PendingAction) => void;
  consumePendingAction: () => PendingAction | null;
}

export const useAuthModalStore = create<AuthModalState>((set, get) => ({
  isOpen: false,
  pendingAction: null,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setPendingAction: (action) => set({ pendingAction: action }),
  consumePendingAction: () => {
    const action = get().pendingAction;
    set({ pendingAction: null });
    return action;
  },
}));
