import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { shopKeys } from '@/lib/shop/queryKeys';
import { shopQueriesService, type BorderCollectionSummary } from '@/services/shop/shopQueries';

export function useBorderCollectionsMap() {
  const query = useQuery({
    queryKey: shopKeys.borderCollections(),
    queryFn: () => shopQueriesService.getBorderCollections(),
    staleTime: 120_000,
  });

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of query.data ?? []) m.set(c.id, c.name);
    return m;
  }, [query.data]);

  const rowById = useMemo(() => {
    const m = new Map<string, BorderCollectionSummary>();
    for (const c of query.data ?? []) m.set(c.id, c);
    return m;
  }, [query.data]);

  return { ...query, nameById, rowById };
}
