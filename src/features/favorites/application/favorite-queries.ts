import { queryOptions } from '@tanstack/react-query';

import { loadFavoriteProductIds } from '@/features/favorites/data/supabase-favorites-repository';

export const favoriteKeys = {
  all: ['favorites'] as const,
  byUser: (userId: string) => [...favoriteKeys.all, userId] as const,
};

export function favoriteProductIdsQuery(userId: string) {
  return queryOptions({
    queryKey: favoriteKeys.byUser(userId),
    queryFn: ({ signal }) => loadFavoriteProductIds(userId, signal),
  });
}
