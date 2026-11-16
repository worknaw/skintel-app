import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { favoriteKeys, favoriteProductIdsQuery } from '@/features/favorites/application/favorite-queries';
import { saveFavorite } from '@/features/favorites/data/supabase-favorites-repository';
import { useAuthSession } from '@/features/auth/ui/auth-session-provider';
import type { ProductId } from '@/features/products/domain/product';

export type FavoriteToggleResult = 'authentication-required' | 'updated';

export function useProductFavorite(productId: ProductId) {
  const queryClient = useQueryClient();
  const { session } = useAuthSession();
  const userId = session?.user.id;
  const favorites = useQuery({
    ...favoriteProductIdsQuery(userId ?? ''),
    enabled: Boolean(userId),
  });
  const isFavorite = Boolean(userId && favorites.data?.includes(productId));

  const mutation = useMutation({
    scope: { id: `favorites:${userId ?? 'guest'}` },
    mutationFn: ({ owner, favorite }: { owner: string; favorite: boolean }) => saveFavorite(owner, productId, favorite),
    onSettled: async (_data, _error, variables) => {
      await queryClient.invalidateQueries({ queryKey: favoriteKeys.byUser(variables.owner) });
    },
  });

  const toggleFavorite = useCallback(async (): Promise<FavoriteToggleResult> => {
    if (!userId) return 'authentication-required';
    if (!favorites.isSuccess || favorites.isFetching) throw new Error('Favorites are not ready');
    await mutation.mutateAsync({ owner: userId, favorite: !isFavorite });
    return 'updated';
  }, [favorites.isFetching, favorites.isSuccess, isFavorite, mutation, userId]);

  return {
    isFavorite,
    isUpdating: mutation.isPending,
    toggleFavorite,
  } as const;
}
