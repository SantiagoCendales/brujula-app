import { useCallback, useEffect, useState } from 'react';
import { request } from './api.js';

// Loads `path` from the API and reloads when it changes; a null path loads nothing.
// `setData` lets a screen replace the data with what an action returns, without fetching again.
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) });
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    request(path)
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, error, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [path, reloadCount]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);
  const setData = useCallback((data) => setState((previous) => ({ ...previous, data })), []);

  return { ...state, reload, setData };
}
