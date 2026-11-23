import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useApiData<T>(url: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<T>(url);
      setData(res.data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error ??
        (err as Error)?.message ??
        'Unable to load data.';
      setError(message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { data, loading, error, reload: fetchData };
}
