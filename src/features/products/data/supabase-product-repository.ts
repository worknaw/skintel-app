import { supabase } from '@/core/supabase/client';
import type { Product, ProductPage, ProductQuery, ProductSummary } from '@/features/products/domain/product';
import type { ProductRepository } from '@/features/products/domain/product-repository';

type SummaryRow = { id: string; name: string; category_id: ProductSummary['categoryId']; tags: string[]; key_ingredients?: string[]; review_count: number; routine_roles: Product['routineRoles']; brands: { name: string } | null; variants: { price_minor: number; currency: string }[] | null };
type DetailRow = Omit<SummaryRow, 'variants'> & { size: string; rating: number | null; review_count: number; description: string; key_ingredients: string[]; ingredient_list: string[]; skin_types: string[]; concerns: string[]; routine_roles: Product['routineRoles']; variants: { price_minor: number; currency: string }[] | null };

export function normalizeProductQuery(query: ProductQuery): ProductQuery { return { ...query, limit: Number.isFinite(query.limit) ? Math.max(1, Math.min(30, Math.floor(query.limit))) : 30 }; }
export function escapeProductSearch(value: string) { return value.replace(/[\\%_]/g, '\\$&'); }
export function mapProductSummary(row: SummaryRow): ProductSummary {
  const first = [...(row.variants ?? [])].sort((a, b) => a.price_minor - b.price_minor)[0];
  return { id: row.id, brandName: row.brands?.name ?? '', name: row.name, imageUrl: null, categoryId: row.category_id, reviewCount: row.review_count, startingPrice: first ? { amountMinor: first.price_minor, currency: first.currency } : null, tags: row.tags ?? [], keyIngredients: row.key_ingredients ?? [], routineRoles: row.routine_roles ?? [] };
}
function mapProduct(row: DetailRow): Product { return { ...mapProductSummary(row), size: row.size, rating: row.rating, reviewCount: row.review_count, description: row.description, keyIngredients: row.key_ingredients, ingredientList: row.ingredient_list, skinTypes: row.skin_types, concerns: row.concerns, routineRoles: row.routine_roles }; }

export const supabaseProductRepository: ProductRepository = {
  async list(query, signal) {
    const normalized = normalizeProductQuery(query);
    let request = supabase.from('products').select('id,name,category_id,tags,key_ingredients,review_count,routine_roles,brands(name),variants:store_variants(price_minor,currency)', { count: 'exact' }).eq('active', true).limit(normalized.limit);
    if (normalized.categoryId) request = request.eq('category_id', normalized.categoryId);
    if (normalized.search?.trim()) request = request.ilike('search_text', `%${escapeProductSearch(normalized.search.trim())}%`);
    request = request.order(normalized.sort === 'recent' ? 'created_at' : 'review_count', { ascending: false }).order('id');
    if (signal) request = request.abortSignal(signal);
    const { data, error, count } = await request;
    if (error) throw error;
    const items = ((data ?? []) as unknown as SummaryRow[]).map(mapProductSummary);
    if (normalized.sort === 'price-asc' || normalized.sort === 'price-desc') items.sort((a, b) => {
      if (!a.startingPrice) return b.startingPrice ? 1 : 0;
      if (!b.startingPrice) return -1;
      return normalized.sort === 'price-asc' ? a.startingPrice.amountMinor - b.startingPrice.amountMinor : b.startingPrice.amountMinor - a.startingPrice.amountMinor;
    });
    return { items, nextCursor: null, total: count ?? items.length } satisfies ProductPage;
  },
  async getById(id, signal) {
    let request = supabase.from('products').select('id,name,category_id,tags,size,rating,review_count,description,key_ingredients,ingredient_list,skin_types,concerns,routine_roles,brands(name),variants:store_variants(price_minor,currency)').eq('id', id).eq('active', true);
    if (signal) request = request.abortSignal(signal);
    const { data, error } = await request.maybeSingle();
    if (error) throw error;
    return data ? mapProduct(data as unknown as DetailRow) : null;
  },
  async getSummariesByIds(ids, signal) {
    if (ids.length === 0) return [];
    let request = supabase.from('products').select('id,name,category_id,tags,key_ingredients,review_count,routine_roles,brands(name),variants:store_variants(price_minor,currency)')
      .in('id', [...new Set(ids)]).eq('active', true);
    if (signal) request = request.abortSignal(signal);
    const { data, error } = await request;
    if (error) throw error;
    const rows = ((data ?? []) as unknown as SummaryRow[]).map(mapProductSummary);
    const order = new Map(ids.map((id, index) => [id, index]));
    return rows.sort((left, right) => (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.id) ?? Number.MAX_SAFE_INTEGER));
  },
};
