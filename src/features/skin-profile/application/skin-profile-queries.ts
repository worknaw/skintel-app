import { queryOptions } from '@tanstack/react-query';

import { getSkinProfile } from '@/features/skin-profile/data/supabase-skin-profile-repository';

export const skinProfileQueryKey = (userId: string) => ['skin-profile', userId] as const;

export function skinProfileQuery(userId: string) {
  return queryOptions({
    queryKey: skinProfileQueryKey(userId),
    queryFn: ({ signal }) => getSkinProfile(userId, signal),
    staleTime: 60_000,
  });
}
