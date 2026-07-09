import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { api } from './client';
import type { AnalyzeResponse, AppConfig, GenerationOut, HealthStatus, StyleOption } from './types';

// ── Boot-time static data ──────────────────────────────────────────────
export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: () => api.get<AppConfig>('/config'),
    staleTime: Infinity,
  });
}

export function useStyles() {
  return useQuery({
    queryKey: ['styles'],
    queryFn: () => api.get<StyleOption[]>('/styles'),
    staleTime: 60 * 60 * 1000,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<HealthStatus>('/health'),
    refetchInterval: 30_000,
    retry: false,
  });
}

// ── Analyze (synchronous mutation) ─────────────────────────────────────
export function useAnalyzeRoom() {
  return useMutation({
    mutationFn: ({ image, style }: { image: File; style: string }) => {
      const formData = new FormData();
      formData.append('image', image);
      formData.append('style', style);
      return api.postForm<AnalyzeResponse>('/analyze', formData);
    },
  });
}

// ── Generate (async — returns pending row immediately) ─────────────────
export function useGenerateDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (analysis_id: number) => api.post<GenerationOut>('/generate', { analysis_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['history'] }),
  });
}

// ── Refine (async — returns pending child row immediately) ─────────────
export function useRefineDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ generation_id, instruction }: { generation_id: number; instruction: string }) =>
      api.post<GenerationOut>('/refine', { generation_id, instruction }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['history'] }),
  });
}

// ── Single generation fetch — used directly AND by the polling hook ────
export function useGeneration(id: number | null, opts?: { poll?: boolean }): UseQueryResult<GenerationOut> {
  return useQuery({
    queryKey: ['generation', id],
    queryFn: () => api.get<GenerationOut>(`/generation/${id}`),
    enabled: id !== null,
    refetchInterval: (query) => {
      if (!opts?.poll) return false;
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'failed') return false;
      return 2000;
    },
  });
}

// ── History ──────────────────────────────────────────────────────────
export function useHistory(limit = 50) {
  return useQuery({
    queryKey: ['history', limit],
    queryFn: () => api.get<GenerationOut[]>(`/history?limit=${limit}`),
  });
}

export function useSelectVariation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ generationId, variationId }: { generationId: number; variationId: number }) =>
      api.post<GenerationOut>(`/history/${generationId}/select/${variationId}`, {}),
    onSuccess: (data) => {
      qc.setQueryData(['generation', data.id], data);
      qc.invalidateQueries({ queryKey: ['history'] });
    },
  });
}

export function useDeleteGeneration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del<{ deleted: boolean }>(`/history/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['history'] }),
  });
}
