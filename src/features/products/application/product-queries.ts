import { queryOptions } from '@tanstack/react-query';

import { supabaseProductRepository } from '@/features/products/data/supabase-product-repository';
import type { ProductId, ProductQuery } from '@/features/products/domain/product';

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (query: ProductQuery) => [...productKeys.lists(), query] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: ProductId) => [...productKeys.details(), id] as const,
};

export function productListQuery(query: ProductQuery) {
  return queryOptions({
    queryKey: productKeys.list(query),
    queryFn: ({ signal }) => supabaseProductRepository.list(query, signal),
  });
}

export function productDetailQuery(id: ProductId) {
  return queryOptions({
    queryKey: productKeys.detail(id),
    queryFn: ({ signal }) => supabaseProductRepository.getById(id, signal),
  });
}

export function productSummariesByIdsQuery(ids: readonly ProductId[]) {
  return queryOptions({
    queryKey: [...productKeys.lists(), 'saved', ids] as const,
    queryFn: ({ signal }) => supabaseProductRepository.getSummariesByIds(ids, signal),
  });
}
