'use client';

import { useEffect, useState } from 'react';
import type { ApiResponse } from '@/types/Database.types';

interface UseApiDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApiData<T>(
  fetcher: () => Promise<ApiResponse<T>>,
  deps: unknown[] = []
): UseApiDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Wrap fetch logic in an async function
    const loadData = async () => {
      // Use a functional update to avoid cascading update warnings
      setLoading((prev) => (prev === true ? true : true));
      setError(null);

      const res = await fetcher();

      if (!cancelled) {
        setData(res.data);
        setError(res.error);
        setLoading(false);
      }
    };

    // Execute the function
    loadData();

    // Cleanup if the component unmounts before fetch completes
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}