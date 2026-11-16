import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { useAppNotification } from '@/components/ui/app-notification';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/features/auth/ui/auth-session-provider';
import { formatMoney } from '@/features/products/application/format-money';
import { addCartItem, getStoreVariants } from '@/features/store/data/store-repository';

export function StorePurchaseArea({ productId }: Readonly<{ productId: string }>) {
  const { session } = useAuthSession();
  const userId = session?.user.id;
  const router = useRouter();
  const client = useQueryClient();
  const { showNotification } = useAppNotification();
  const insets = useSafeAreaInsets();
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const variants = useQuery({ queryKey: ['store-variants', productId], queryFn: () => getStoreVariants(productId) });
  const add = useMutation({
    mutationFn: ({ owner, id }: { owner: string; id: string }) => addCartItem(owner, id),
    onSuccess: async (_result, variables) => {
      await client.invalidateQueries({ queryKey: ['cart', variables.owner] });
      showNotification({ title: 'เพิ่มลงตะกร้าแล้ว', message: 'ดูรายการสินค้าได้ในตะกร้า', variant: 'success' });
    },
    onError: () => showNotification({ title: 'เพิ่มสินค้าไม่สำเร็จ', message: 'กรุณาลองใหม่อีกครั้ง', variant: 'error' }),
  });
  const variant = variants.data?.find((item) => item.id === selectedVariantId) ?? variants.data?.[0];
  const stockAvailable = Boolean(variant && variant.stock > 0);
  const addToCart = () => {
    if (!variant || !userId) {
      if (!variant) return;
      router.push({ pathname: '/auth', params: { returnTo: `/product/${productId}` } });
      return;
    }
    add.mutate({ owner: userId, id: variant.id });
  };
  const buyNow = () => {
    if (!variant) return;
    const returnTo = `/checkout?variantId=${encodeURIComponent(variant.id)}`;
    if (!userId) { router.push({ pathname: '/auth', params: { returnTo } }); return; }
    router.push({ pathname: '/checkout', params: { variantId: variant.id } } as never);
  };

  return <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.two) }]}>
    <View style={styles.content}>
      <View style={styles.productLine}>
        <AppText variant="h3">สินค้าในร้าน SkinCycle</AppText>
        {variants.isPending ? <AppText tone="secondary">กำลังตรวจสอบสินค้า...</AppText> : variants.isError ?
          <AppText tone="secondary">ขณะนี้ยังโหลดข้อมูลร้านไม่ได้</AppText> : !variant ?
            <AppText tone="secondary">สินค้านี้ยังไม่เปิดจำหน่ายในร้าน</AppText> : <>
              <AppText tone="secondary">{variant.label} · {formatMoney({ amountMinor: variant.price_minor, currency: variant.currency })}</AppText>
              {variants.data.length > 1 ? <View style={styles.variantList}>{variants.data.map((item) => {
                const selected = item.id === variant.id;
                return <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setSelectedVariantId(item.id)} style={[styles.variantChip, selected && styles.variantChipSelected]}><AppText variant="caption" tone={selected ? 'inverse' : 'brand'}>{item.label}</AppText></Pressable>;
              })}</View> : null}
            </>}
      </View>
      <AppButton label={add.isPending ? 'กำลังเพิ่มสินค้า...' : stockAvailable ? 'เพิ่มลงตะกร้า' : 'สินค้าหมด'} disabled={!stockAvailable || add.isPending} onPress={addToCart} />
      <AppButton label="ซื้อเลย" variant="secondary" disabled={!stockAvailable || add.isPending} onPress={buyNow} />
      <AppButton label="ดูตะกร้าสินค้า" variant="secondary" onPress={() => router.push('/cart' as never)} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  footer: { borderTopWidth: 1, borderTopColor: Palette.border, backgroundColor: Palette.surface, paddingTop: Spacing.three, paddingHorizontal: Spacing.three, shadowColor: '#24352A', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: -5 }, elevation: 16 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: Spacing.two },
  productLine: { gap: Spacing.half },
  variantList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, marginTop: Spacing.one },
  variantChip: { borderRadius: Radius.round, borderWidth: 1, borderColor: Palette.primary, backgroundColor: Palette.softGreen, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half },
  variantChipSelected: { borderColor: Palette.primaryDark, backgroundColor: Palette.primaryDark },
});
