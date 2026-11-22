import { useEffect } from 'react';
import { useApi } from '@/lib/useApi';

export function usePermissions() {
  const { data, error, loading, reload } = useApi('/permissions/me');
  useEffect(() => {
    window.addEventListener('focus', reload);
    return () => window.removeEventListener('focus', reload);
  }, [reload]);
  return { permissions: data?.permissions ?? [], error, loading };
}
