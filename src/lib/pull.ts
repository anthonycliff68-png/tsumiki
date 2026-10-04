import { useState } from 'react';

/**
 * Pull-to-refresh that only spins when you actually pulled.
 *
 * These screens used to pass a query's `isRefetching` straight to
 * RefreshControl. That flag is true for *any* refetch, including the quiet
 * background one a check-in sets off when it invalidates the cache — so iOS
 * dragged the scroll view down to show a spinner nobody asked for and sprang
 * it back. On Today that read as the page shifting every time you checked in.
 */
export function usePull(...load: Array<() => Promise<unknown>>) {
  const [refreshing, setRefreshing] = useState(false);

  return {
    refreshing,
    onRefresh: () => {
      setRefreshing(true);
      void Promise.all(load.map((fn) => fn())).finally(() => setRefreshing(false));
    },
  };
}
