import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGeneration } from '../api/queries';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { API_PREFIX, getAuthHeader } from '../api/client';
import { logger } from '../lib/logger';
import { type GenerationOut } from '../api/types';

const TIMEOUT_MS = 90_000;

export function usePollGeneration(id: number | null) {
  const query = useGeneration(id);
  const qc = useQueryClient();
  const [timedOut, setTimedOut] = useState(false);
  const startRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (id === null) return;
    startRef.current = Date.now();
    setTimedOut(false);
  }, [id]);

  useEffect(() => {
    if (id === null) return;
    
    // Stop SSE if terminal state reached
    const status = query.data?.status;
    if (status === 'completed' || status === 'failed' || status === 'failed_analysis') {
      return;
    }

    abortControllerRef.current = new AbortController();
    
    const connectSSE = async () => {
      try {
        const headers = await getAuthHeader();
        await fetchEventSource(`${API_PREFIX}/generation/${id}/status`, {
          method: 'GET',
          headers,
          signal: abortControllerRef.current?.signal,
          onmessage(msg) {
            if (msg.event === 'message') {
              const data = JSON.parse(msg.data) as GenerationOut;
              qc.setQueryData(['generation', id], data);
              // Invalidate history to keep sidebar fresh
              qc.invalidateQueries({ queryKey: ['history'], exact: false });
            }
          },
          onerror(err) {
            logger.warn(`SSE error for generation ${id}:`, err);
          },
          onclose() {
             logger.debug(`SSE closed for generation ${id}`);
          }
        });
      } catch (err) {
        logger.error(`SSE connection failed for generation ${id}:`, err);
      }
    };
    
    connectSSE();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [id, query.data?.status, qc]);

  useEffect(() => {
    if (!query.data || query.data.status === 'completed' || query.data.status === 'failed') return;
    const interval = setInterval(() => {
      if (startRef.current && Date.now() - startRef.current > TIMEOUT_MS) setTimedOut(true);
    }, 1000);
    return () => clearInterval(interval);
  }, [query.data]);

  return {
    generation: query.data,
    isLoading: query.isLoading,
    isPending: query.data?.status === 'pending' || query.data?.status === 'analyzed',
    isCompleted: query.data?.status === 'completed',
    isFailed: query.data?.status === 'failed' || query.data?.status === 'failed_analysis',
    timedOut,
    resetTimeout: () => {
      startRef.current = Date.now();
      setTimedOut(false);
    },
  };
}
