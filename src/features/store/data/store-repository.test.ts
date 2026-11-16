import { supabase } from '@/core/supabase/client';
import { addCartItem, createStoreOrder, removeCartItem } from './store-repository';

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => '40000000-0000-4000-8000-000000000001') }));
jest.mock('@/core/supabase/client', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

it('adds a variant without replacing the quantity already in the cart', async () => {
  const upsert = jest.fn().mockResolvedValue({ error: null });
  jest.mocked(supabase.from).mockReturnValue({ upsert } as never);
  await addCartItem('owner', 'variant');
  expect(upsert).toHaveBeenCalledWith(
    { user_id: 'owner', variant_id: 'variant', quantity: 1 },
    { onConflict: 'user_id,variant_id', ignoreDuplicates: true },
  );
});

it('restricts removal to the account and variant requested', async () => {
  const variant = jest.fn().mockResolvedValue({ error: null });
  const owner = jest.fn().mockReturnValue({ eq: variant });
  jest.mocked(supabase.from).mockReturnValue({ delete: () => ({ eq: owner }) } as never);
  await removeCartItem('owner', 'variant');
  expect(owner).toHaveBeenCalledWith('user_id', 'owner');
  expect(variant).toHaveBeenCalledWith('variant_id', 'variant');
});

it('creates a cart checkout with a cryptographically generated idempotency key', async () => {
  jest.mocked(supabase.rpc).mockResolvedValue({ data: 'order-id', error: null } as never);
  await expect(createStoreOrder('address-id')).resolves.toBe('order-id');
  expect(supabase.rpc).toHaveBeenCalledWith('create_store_order', {
    p_address_id: 'address-id',
    p_request_id: '40000000-0000-4000-8000-000000000001',
    p_direct_items: null,
  });
});

it('sends Buy now selections without client-side prices or totals', async () => {
  jest.mocked(supabase.rpc).mockResolvedValue({ data: 'order-id', error: null } as never);
  await createStoreOrder('address-id', [{ variantId: 'variant-id', quantity: 2 }]);
  expect(supabase.rpc).toHaveBeenCalledWith('create_store_order', {
    p_address_id: 'address-id',
    p_request_id: '40000000-0000-4000-8000-000000000001',
    p_direct_items: [{ variant_id: 'variant-id', quantity: 2 }],
  });
});
