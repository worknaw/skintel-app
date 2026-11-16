import type { Product, ProductId, ProductPage, ProductQuery, ProductSummary } from './product';

export interface ProductRepository {
  list(query: ProductQuery, signal?: AbortSignal): Promise<ProductPage>;
  getById(id: ProductId, signal?: AbortSignal): Promise<Product | null>;
  getSummariesByIds(ids: readonly ProductId[], signal?: AbortSignal): Promise<readonly ProductSummary[]>;
}
