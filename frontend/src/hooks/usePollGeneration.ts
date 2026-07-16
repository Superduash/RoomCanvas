import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { type GenerationOut } from '../api/types';
import { logger } from '../lib/logger';

export function usePollGeneration(id: number | null, onComplete?: (gen: GenerationOut) => void) {
  const query = useQuery({
    queryKey: ['generation', id],
    queryFn: () => api.get<GenerationOut>(`/history/${id}`),
    enabled: id !== null,
    // Progressive backoff: start at 2s, max out at 10s
    refetchInterval: (q) => {
      const data = q.state.data;
      if (data && (data.status === 'completed' || data.status === 'failed' || data.status === 'failed_analysis')) {
        return false; // stop polling
      }
      
      const failCount = q.state.dataUpdateCount;
      if (failCount < 5) return 2000;
      if (failCount < 15) return 5000;
      return 10000;
    },
    // Don't kill the polling if the window loses focus
    refetchOnWindowFocus: false, 
  });

  // Call onComplete exactly once when it reaches a terminal state successfully
  useEffect(() => {
    if (query.data?.status === 'completed') {
      logger.info(`Generation ${id} completed successfully.`);
      if (onComplete) onComplete(query.data);
    }
  }, [query.data?.status, id, onComplete]);

  return {
    generation: query.data,
    isLoading: query.isLoading,
    isPending: query.data?.status === 'pending' || query.data?.status === 'analyzed',
    isCompleted: query.data?.status === 'completed',
    isFailed: query.data?.status === 'failed' || query.data?.status === 'failed_analysis',
  };
}
