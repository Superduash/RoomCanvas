import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { api, ApiError } from './client';
import type { AnalyzeResponse, AppConfig, GenerationOut, HealthStatus, StyleOption, Project, ProjectDetails } from './types';
import { logger } from '../lib/logger';
import { useUIStore } from '../store/uiStore';

// ── Boot-time static data ──────────────────────────────────────────────
export function useConfig() {
  const isGenerating = useUIStore(s => s.isGenerating);
  return useQuery({
    queryKey: ['config'],
    queryFn: () => api.get<AppConfig>('/config'),
    staleTime: Infinity,
    refetchOnWindowFocus: !isGenerating,
  });
}

export function useStyles() {
  const isGenerating = useUIStore(s => s.isGenerating);
  return useQuery({
    queryKey: ['styles'],
    queryFn: () => api.get<StyleOption[]>('/styles'),
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: !isGenerating,
  });
}

export function useUserStats(enabled = true) {
  const isGenerating = useUIStore(s => s.isGenerating);
  return useQuery({
    queryKey: ['user_stats'],
    queryFn: () => api.get<{ total_designs: number; favorite_style: string | null; member_since: string }>('/auth/me/stats'),
    staleTime: 60000,
    enabled,
    refetchOnWindowFocus: !isGenerating,
  });
}

export function useHealth() {
  const isGenerating = useUIStore(s => s.isGenerating);
  return useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<HealthStatus>('/health'),
    refetchInterval: isGenerating ? false : 30_000,
    retry: false,
    refetchOnWindowFocus: !isGenerating,
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
    mutationFn: ({ analysisId, forceNew, customization, instruction }: { analysisId: number; forceNew?: boolean; customization?: any; instruction?: string }) =>
      api.post<GenerationOut>('/generate', { analysis_id: analysisId, force_new: forceNew ?? false, customization, instruction }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['history'], exact: false });
      qc.invalidateQueries({ queryKey: ['project_timeline'], exact: false });
    },
  });
}

// ── Refine (async — returns pending child row immediately) ─────────────
export function useRefineDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ generation_id, instruction, customization }: { generation_id: number; instruction?: string; customization?: any }) =>
      api.post<GenerationOut>('/refine', { generation_id, instruction, customization }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['history'], exact: false });
      qc.invalidateQueries({ queryKey: ['project_timeline'], exact: false });
    },
  });
}

export function useGeneration(id: number | null): UseQueryResult<GenerationOut> {
  return useQuery({
    queryKey: ['generation', id],
    queryFn: () => api.get<GenerationOut>(`/generation/${id}`),
    enabled: id !== null,
  });
}

// ── History ──────────────────────────────────────────────────────────
export function useHistory(limit = 50, enabled = true) {
  const isGenerating = useUIStore(s => s.isGenerating);
  return useQuery({
    queryKey: ['history', limit],
    queryFn: () => api.get<Project[]>(`/history?limit=${limit}`),
    staleTime: 30000,
    gcTime: 15 * 60000,
    enabled,
    refetchOnMount: true,
    refetchOnWindowFocus: !isGenerating,
  });
}

export function useProjectTimeline(projectId: number | null) {
  return useQuery({
    queryKey: ['project_timeline', projectId],
    queryFn: () => api.get<ProjectDetails>(`/projects/${projectId}`),
    enabled: projectId !== null,
    staleTime: 30000,
    refetchOnMount: true,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const isGenerating = data.timeline.some(g => g.status === 'pending' || g.status === 'analyzed');
      return isGenerating ? 2500 : false;
    },
  });
}

export function useSelectVariation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ generationId, variationId }: { generationId: number; variationId: number }) =>
      api.post<GenerationOut>(`/history/${generationId}/select/${variationId}`, {}),
    onSuccess: (data) => {
      qc.setQueryData(['generation', data.id], data);
      qc.invalidateQueries({ queryKey: ['history'], exact: false });
      qc.invalidateQueries({ queryKey: ['project_timeline'], exact: false });
    },
  });
}

export function useDeleteGeneration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del<{ deleted: boolean }>(`/history/${id}`),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: ['generation', id] });
      qc.invalidateQueries({ queryKey: ['history'], exact: false });
      qc.invalidateQueries({ queryKey: ['project_timeline'], exact: false });
    },
    onError: (err) => {
      const detail = err instanceof ApiError ? err.message : 'Unknown error';
      logger.error(`[useDeleteGeneration] Failed: ${detail}`, err);
    },
  });
}

export function useDeleteRefinement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del<{ deleted: boolean }>(`/history/refinement/${id}`),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: ['generation', id] });
      qc.invalidateQueries({ queryKey: ['history'], exact: false });
      qc.invalidateQueries({ queryKey: ['project_timeline'], exact: false });
    },
    onError: (err) => {
      const detail = err instanceof ApiError ? err.message : 'Unknown error';
      logger.error(`[useDeleteRefinement] Failed: ${detail}`, err);
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del<{ deleted: boolean }>(`/projects/${id}`),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: ['project_timeline', id] });
      qc.invalidateQueries({ queryKey: ['history'], exact: false });
      qc.invalidateQueries({ queryKey: ['project_timeline'], exact: false });
    },
    onError: (err) => {
      const detail = err instanceof ApiError ? err.message : 'Unknown error';
      logger.error(`[useDeleteProject] Failed: ${detail}`, err);
    },
  });
}

/**
 * Delete ALL history entries (library clear).
 * Previously named useDeleteAllRefinements — now correctly named.
 */
export function useDeleteAllHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.del<{ deleted: boolean }>('/history/all'),
    onSuccess: () => {
      qc.setQueryData(['history', 50], []);
      qc.invalidateQueries({ queryKey: ['history'], exact: false });
      qc.invalidateQueries({ queryKey: ['project_timeline'], exact: false });
    },
    onError: (err) => {
      const detail = err instanceof ApiError ? err.message : 'Unknown error';
      logger.error(`[useDeleteAllHistory] Failed: ${detail}`, err);
    },
  });
}


export function useRenameGeneration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      api.patch<GenerationOut>(`/history/${id}`, { room_type_detected: title }),
    onSuccess: (data) => {
      // Optimistically update the individual generation cache
      qc.setQueryData(['generation', data.id], data);
      qc.invalidateQueries({ queryKey: ['history'], exact: false });
      qc.invalidateQueries({ queryKey: ['project_timeline'], exact: false });
    },
    onError: (err) => {
      const detail = err instanceof ApiError ? err.message : 'Unknown error';
      logger.error(`[useRenameGeneration] Failed: ${detail}`, err);
    },
  });
}

// ── User API Keys ─────────────────────────────────────────────────────────
export interface UserKeyStatus {
  provider: string;
  preferred_text_model?: string;
  preferred_image_model?: string;
}

export interface ActiveProviderStatus {
  is_available: boolean;
  provider_name?: string;
  is_platform: boolean;
}

export function useActiveProvider() {
  const isGenerating = useUIStore(s => s.isGenerating);
  return useQuery({
    queryKey: ['active_provider'],
    queryFn: () => api.get<ActiveProviderStatus>('/settings/keys/active'),
    staleTime: 60000,
    refetchOnWindowFocus: !isGenerating,
  });
}

export function useActiveTextProvider() {
  const isGenerating = useUIStore(s => s.isGenerating);
  return useQuery({
    queryKey: ['active_text_provider'],
    queryFn: () => api.get<ActiveProviderStatus>('/settings/keys/active-text'),
    staleTime: 60000,
    refetchOnWindowFocus: !isGenerating,
  });
}

export function useUserKeys() {
  return useQuery({
    queryKey: ['user_keys'],
    queryFn: () => api.get<UserKeyStatus[]>('/settings/keys'),
  });
}

export function useSaveUserKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { provider: string; api_key: string; preferred_text_model?: string; preferred_image_model?: string }) =>
      api.put<{ message: string }>('/settings/keys', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user_keys'] });
      qc.invalidateQueries({ queryKey: ['active_provider'] });
      qc.invalidateQueries({ queryKey: ['active_text_provider'] });
    },
  });
}

export function useDeleteUserKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider: string) => api.del<{ message: string }>(`/settings/keys/${provider}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user_keys'] });
      qc.invalidateQueries({ queryKey: ['active_provider'] });
      qc.invalidateQueries({ queryKey: ['active_text_provider'] });
    },
  });
}

