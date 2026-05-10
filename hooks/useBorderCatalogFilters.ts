import { useMemo, useState } from 'react';
import type { ShopItemRow } from '@/lib/shop/types';
import {
  filterBorderItems,
  sortBorderItems,
  type BorderFilterState,
  type BorderSortKey,
} from '@/lib/shop/borderDisplayModel';

export function useBorderCatalogLists(
  borders: ShopItemRow[],
  ownsBorder: (id: string) => boolean,
  initialFilter?: Partial<BorderFilterState>,
  initialSort?: BorderSortKey,
) {
  const [filter, setFilter] = useState<BorderFilterState>({
    ownedOnly: false,
    acquisition: 'all',
    ...initialFilter,
  });
  const [sort, setSort] = useState<BorderSortKey>(initialSort ?? 'default');

  const processed = useMemo(() => {
    const f = filterBorderItems(borders, filter, ownsBorder);
    return sortBorderItems(f, sort);
  }, [borders, filter, sort, ownsBorder]);

  return { processed, filter, setFilter, sort, setSort };
}
