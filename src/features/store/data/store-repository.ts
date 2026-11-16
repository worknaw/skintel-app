import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';

import { supabase } from '@/core/supabase/client';

export type StoreVariant = Readonly<{ id: string; label: string; price_minor: number; currency: string; stock: number }>;
export type CartItem = Readonly<{ variant_id: string; quantity: number; store_variants: (StoreVariant & { products: { name: string } | null }) | null }>;
export type AddressDraft = Readonly<{ recipient: string; phone: string; address_line: string; subdistrict: string; district: string; province: string; postal_code: string; latitude?: number | null; longitude?: number | null; is_default?: boolean }>;
export type ShippingAddress = AddressDraft & Readonly<{ id: string }>;
export type StorePaymentProof = Readonly<{ id: string; status: 'submitted' | 'approved' | 'rejected'; storage_path: string; submitted_at: string; reviewed_at: string | null; reviewer_note: string | null }>;
export type StoreOrder = Readonly<{ id: string; status: string; subtotal_minor: number; shipping_fee_minor: number; total_minor: number; created_at: string; payment_reference: string | null; payment_instructions: string | null; promptpay_target: string | null; promptpay_display_name: string | null; shipping_carrier: string | null; tracking_number: string | null; shipped_at: string | null; store_payment_proofs: readonly StorePaymentProof[]; store_order_items: readonly { product_name: string; variant_label: string; quantity: number; unit_price_minor: number }[] }>;
export type DirectCheckoutItem = Readonly<{ variantId: string; quantity: number }>;
export type StoreVariantDetail = StoreVariant & Readonly<{ products: { name: string } | null }>;
export type StoreCheckoutConfig = Readonly<{ checkout_enabled: boolean; shipping_fee_minor: number | null; payment_instructions: string | null; shipping_carrier: string | null }>;

const orderSelect = 'id,status,subtotal_minor,shipping_fee_minor,total_minor,created_at,payment_reference,payment_instructions,promptpay_target,promptpay_display_name,shipping_carrier,tracking_number,shipped_at,store_payment_proofs(id,status,storage_path,submitted_at,reviewed_at,reviewer_note),store_order_items(product_name,variant_label,quantity,unit_price_minor)';

export async function getStoreCheckoutConfig(): Promise<StoreCheckoutConfig | null> {
  const { data, error } = await supabase.rpc('get_store_checkout_config_v3');
  if (error) throw error;
  return ((data as StoreCheckoutConfig[] | null)?.[0] ?? null);
}

export async function getOrders(userId: string): Promise<StoreOrder[]> {
  const { data, error } = await supabase.from('store_orders')
    .select(orderSelect)
    .eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as StoreOrder[];
}

export async function getStoreOrder(userId: string, orderId: string): Promise<StoreOrder | null> {
  const { data, error } = await supabase.from('store_orders').select(orderSelect)
    .eq('user_id', userId).eq('id', orderId).maybeSingle();
  if (error) throw error;
  return data as unknown as StoreOrder | null;
}

function paymentProofFileExtension(asset: ImagePickerAsset) {
  const fromMime = asset.mimeType?.split('/')[1]?.toLowerCase();
  if (fromMime === 'jpeg' || fromMime === 'jpg' || fromMime === 'png' || fromMime === 'webp') return fromMime === 'jpeg' ? 'jpg' : fromMime;
  const fromName = asset.fileName?.split('.').pop()?.toLowerCase();
  if (fromName === 'jpeg' || fromName === 'jpg' || fromName === 'png' || fromName === 'webp') return fromName === 'jpeg' ? 'jpg' : fromName;
  return 'jpg';
}

function paymentProofContentType(extension: string) {
  return extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
}

export async function submitStorePaymentProof(orderId: string, userId: string, asset: ImagePickerAsset): Promise<void> {
  if (!orderId || !userId || !asset.uri) throw new Error('Payment proof is incomplete');
  if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) throw new Error('Payment proof is too large');

  const extension = paymentProofFileExtension(asset);
  const storagePath = `${userId}/${orderId}/${Crypto.randomUUID()}.${extension}`;
  const contents = await new File(asset.uri).arrayBuffer();
  if (contents.byteLength > 5 * 1024 * 1024) throw new Error('Payment proof is too large');

  const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(storagePath, contents, {
    contentType: paymentProofContentType(extension),
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { error: submitError } = await supabase.rpc('submit_store_payment_proof', {
    p_order_id: orderId,
    p_storage_path: storagePath,
  });
  if (!submitError) return;

  await supabase.storage.from('payment-proofs').remove([storagePath]);
  throw submitError;
}

export async function cancelOrder(id: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_store_order', { p_order_id: id });
  if (error) throw error;
}

export async function createStoreOrder(addressId: string, directItems?: readonly DirectCheckoutItem[]): Promise<string> {
  if (!addressId) throw new Error('Address is required');
  if (directItems?.some((item) => !item.variantId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) {
    throw new Error('Invalid checkout items');
  }
  const { data, error } = await supabase.rpc('create_store_order', {
    p_address_id: addressId,
    p_request_id: Crypto.randomUUID(),
    p_direct_items: directItems ? directItems.map((item) => ({ variant_id: item.variantId, quantity: item.quantity })) : null,
  });
  if (error) throw error;
  if (!data) throw new Error('Order was not created');
  return data;
}

export async function getAddresses(userId: string): Promise<ShippingAddress[]> {
  const { data, error } = await supabase.from('shipping_addresses')
    .select('id,recipient,phone,address_line,subdistrict,district,province,postal_code,latitude,longitude,is_default')
    .eq('user_id', userId).order('is_default', { ascending: false }).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ShippingAddress[];
}

export async function saveAddress(userId: string, address: AddressDraft, id?: string): Promise<void> {
  const request = id
    ? supabase.from('shipping_addresses').update(address).eq('user_id', userId).eq('id', id).select('id').single()
    : supabase.from('shipping_addresses').insert({ ...address, user_id: userId }).select('id').single();
  const { data, error } = await request;
  if (error) throw error;
  if (address.is_default && data?.id) {
    const { error: defaultError } = await supabase.rpc('set_default_shipping_address', { p_address_id: data.id });
    if (defaultError) throw defaultError;
  }
}

export async function setDefaultAddress(id: string): Promise<void> {
  const { error } = await supabase.rpc('set_default_shipping_address', { p_address_id: id });
  if (error) throw error;
}

export async function deleteAddress(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from('shipping_addresses').delete().eq('user_id', userId).eq('id', id).select('id').single();
  if (error) throw error;
}

export async function getStoreVariants(productId: string): Promise<StoreVariant[]> {
  const { data, error } = await supabase.from('store_variants')
    .select('id,label,price_minor,currency,stock').eq('product_id', productId).eq('active', true).order('label');
  if (error) throw error;
  return (data ?? []) as StoreVariant[];
}

export async function getStoreVariant(id: string): Promise<StoreVariantDetail | null> {
  const { data, error } = await supabase.from('store_variants')
    .select('id,label,price_minor,currency,stock,products(name)').eq('id', id).eq('active', true).maybeSingle();
  if (error) throw error;
  return data as unknown as StoreVariantDetail | null;
}

export async function getCart(userId: string): Promise<CartItem[]> {
  const { data, error } = await supabase.from('shopping_cart_items')
    .select('variant_id,quantity,store_variants(id,label,price_minor,currency,stock,products(name))')
    .eq('user_id', userId).order('created_at');
  if (error) throw error;
  return (data ?? []) as unknown as CartItem[];
}

export async function addCartItem(userId: string, variantId: string): Promise<void> {
  const { error } = await supabase.from('shopping_cart_items')
    .upsert({ user_id: userId, variant_id: variantId, quantity: 1 }, { onConflict: 'user_id,variant_id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function removeCartItem(userId: string, variantId: string): Promise<void> {
  const { error } = await supabase.from('shopping_cart_items').delete().eq('user_id', userId).eq('variant_id', variantId);
  if (error) throw error;
}

export async function updateCartQuantity(userId: string, variantId: string, quantity: number): Promise<void> {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error('Invalid quantity');
  const { error } = await supabase.from('shopping_cart_items').update({ quantity })
    .eq('user_id', userId).eq('variant_id', variantId).select('variant_id').single();
  if (error) throw error;
}
