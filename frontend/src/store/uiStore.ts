import { create } from 'zustand';

interface UIState {
  // Upload flow (pre-submission, client-only)
  pendingFile: File | null;
  pendingPreviewUrl: string | null;
  selectedStyleId: string | null;
  setPendingUpload: (file: File | null, previewUrl: string | null) => void;
  setSelectedStyle: (styleId: string | null) => void;
  clearUpload: () => void;

  // The generation currently being viewed on the Results page
  activeGenerationId: number | null;
  setActiveGenerationId: (id: number | null) => void;

  // Refinement panel draft text (survives if user navigates away and back within session)
  refinementDraft: string;
  setRefinementDraft: (text: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  pendingFile: null,
  pendingPreviewUrl: null,
  selectedStyleId: null,
  setPendingUpload: (file, previewUrl) => set({ pendingFile: file, pendingPreviewUrl: previewUrl }),
  setSelectedStyle: (styleId) => set({ selectedStyleId: styleId }),
  clearUpload: () => set({ pendingFile: null, pendingPreviewUrl: null, selectedStyleId: null }),

  activeGenerationId: null,
  setActiveGenerationId: (id) => set({ activeGenerationId: id }),

  refinementDraft: '',
  setRefinementDraft: (text) => set({ refinementDraft: text }),
}));
