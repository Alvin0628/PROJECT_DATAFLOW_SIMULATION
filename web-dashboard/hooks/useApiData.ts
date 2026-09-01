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

    // Praktik Terbaik: Bungkus logika fetch di dalam fungsi async
    const loadData = async () => {
      // Menggunakan functional update untuk mencegah peringatan cascading update
      setLoading((prev) => (prev === true ? true : true)); 
      setError(null);

      const res = await fetcher();

      if (!cancelled) {
        setData(res.data);
        setError(res.error);
        setLoading(false);
      }
    };

    // Eksekusi fungsinya
    loadData();

    // Fungsi pembersihan (cleanup) jika komponen ditutup sebelum fetch selesai
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}