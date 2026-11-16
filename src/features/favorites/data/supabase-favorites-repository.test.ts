import { supabase } from '@/core/supabase/client';

import { loadFavoriteProductIds, saveFavorite } from './supabase-favorites-repository';

jest.mock('@/core/supabase/client', () => ({ supabase: { from: jest.fn() } }));

const mockFrom = supabase.from as jest.Mock;
const mockSelect = jest.fn();

describe('Supabase favorites repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it('loads only the requested owner’s saved product ids', async () => {
    const abortSignal = new AbortController().signal;
    const abortSignalRequest = jest.fn().mockResolvedValue({ data: [{ product_id: 'product-a' }], error: null });
    const ownerRequest = { abortSignal: abortSignalRequest };
    const order = jest.fn(() => ownerRequest);
    const eq = jest.fn(() => ({ order }));
    mockSelect.mockReturnValue({ eq });

    await expect(loadFavoriteProductIds('user-a', abortSignal)).resolves.toEqual(['product-a']);
    expect(mockFrom).toHaveBeenCalledWith('user_favorites');
    expect(mockSelect).toHaveBeenCalledWith('product_id');
    expect(eq).toHaveBeenCalledWith('user_id', 'user-a');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(abortSignalRequest).toHaveBeenCalledWith(abortSignal);
  });

  it('upserts a favorite by the owner/product pair', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert } as never);

    await expect(saveFavorite('user-a', 'product-a', true)).resolves.toBeUndefined();
    expect(upsert).toHaveBeenCalledWith(
      { user_id: 'user-a', product_id: 'product-a' },
      { onConflict: 'user_id,product_id', ignoreDuplicates: true },
    );
  });

  it('deletes only the selected favorite owned by the current user', async () => {
    const productMatch = jest.fn().mockResolvedValue({ error: null });
    const ownerMatch = jest.fn(() => ({ eq: productMatch }));
    const remove = jest.fn(() => ({ eq: ownerMatch }));
    mockFrom.mockReturnValue({ delete: remove } as never);

    await expect(saveFavorite('user-a', 'product-a', false)).resolves.toBeUndefined();
    expect(ownerMatch).toHaveBeenCalledWith('user_id', 'user-a');
    expect(productMatch).toHaveBeenCalledWith('product_id', 'product-a');
  });
});
