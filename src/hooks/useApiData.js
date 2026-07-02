import { useCallback, useEffect, useState } from 'react';

/**
 * Minimal fetch-on-mount hook shared by every list/detail page. Keeps
 * components focused on rendering rather than repeating loading/error
 * boilerplate. `deps` re-triggers the fetch (e.g. filters, pagination).
 */
export function useApiData(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      setData(res.data);
      setMeta(res.meta || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, meta, loading, error, reload, setData };
}
