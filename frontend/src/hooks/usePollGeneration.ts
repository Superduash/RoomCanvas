import { useEffect, useRef, useState } from 'react';
import { useGeneration } from '../api/queries';

const TIMEOUT_MS = 90_000;

export function usePollGeneration(id: number | null) {
  const query = useGeneration(id, { poll: true });
  const [timedOut, setTimedOut] = useState(false);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (id === null) return;
    startRef.current = Date.now();
    setTimedOut(false);
  }, [id]);

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
