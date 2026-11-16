import { supabase } from '@/core/supabase/client';
import type { ProductId } from '@/features/products/domain/product';

type FavoriteRow = Readonly<{ product_id: ProductId }>;

export async function loadFavoriteProductIds(userId: string, signal?: AbortSignal): Promise<readonly ProductId[]> {
  let request = supabase.from('user_favorites').select('product_id').eq('user_id', userId).order('created_at', { ascending: false });
  if (signal) request = request.abortSignal(signal);

  const { data, error } = await request;
  if (error) throw error;
  return ((data ?? []) as FavoriteRow[]).map((row) => row.product_id);
}

export async function saveFavorite(userId: string, productId: ProductId, favorite: boolean): Promise<void> {
  if (favorite) {
    const { error } = await supabase
      .from('user_favorites')
      .upsert({ user_id: userId, product_id: productId }, { onConflict: 'user_id,product_id', ignoreDuplicates: true });
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);
  if (error) throw error;
}
