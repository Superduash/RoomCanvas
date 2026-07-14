import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGeneration } from '../api/queries';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { API_PREFIX, getAuthHeader } from '../api/client';
import { logger } from '../lib/logger';
import { type GenerationOut } from '../api/types';

const TIMEOUT_MS = 150_000; // 150 seconds

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
      let retries = 0;
      const MAX_RETRIES = 5;
      try {
        const headers = await getAuthHeader();
        await fetchEventSource(`${API_PREFIX}/generation/${id}/status`, {
          method: 'GET',
          headers,
          signal: abortControllerRef.current?.signal,
          onmessage(msg) {
            retries = 0; // reset on successful message
            if (msg.event === 'message') {
              const data = JSON.parse(msg.data) as GenerationOut;
              qc.setQueryData(['generation', id], data);
              // Invalidate history to keep sidebar fresh
              qc.invalidateQueries({ queryKey: ['history'], exact: false });
            }
          },
          onerror(err) {
            logger.warn(`SSE error for generation ${id}:`, err);
            retries += 1;
            if (retries >= MAX_RETRIES) {
              // Stop retrying — backup poll will handle status updates
              throw err;
            }
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
    
    const backupPollInterval = setInterval(async () => {
      try {
        const headers = await getAuthHeader();
        const res = await fetch(`${API_PREFIX}/history/${id}`, { headers });
        if (res.ok) {
          const data = await res.json() as GenerationOut;
          qc.setQueryData(['generation', id], data);
          if (data.status === 'completed' || data.status === 'failed' || data.status === 'failed_analysis') {
             clearInterval(backupPollInterval);
          }
        }
      } catch (e) {
        logger.warn(`Backup poll failed for generation ${id}:`, e);
      }
    }, 10000);

    return () => {
      clearInterval(backupPollInterval);
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
