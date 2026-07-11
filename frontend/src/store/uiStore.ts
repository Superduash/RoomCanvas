import { create } from 'zustand';

import type { CustomizationOptions } from '../api/types';

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

  // Last applied customization options per project
  lastCustomization: Record<number, CustomizationOptions>;
  setLastCustomization: (projectId: number, options: CustomizationOptions) => void;
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

  lastCustomization: {},
  setLastCustomization: (projectId, options) =>
    set((state) => ({ lastCustomization: { ...state.lastCustomization, [projectId]: options } })),
}));
