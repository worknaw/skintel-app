import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { AppButton } from '@/components/ui/app-button';
import { useAppNotification } from '@/components/ui/app-notification';
import { FeedbackState } from '@/components/ui/feedback-state';
import { Palette, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/features/auth/ui/auth-session-provider';
import { formatMoney } from '@/features/products/application/format-money';
import { getCart, removeCartItem, updateCartQuantity } from '@/features/store/data/store-repository';

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, isLoading } = useAuthSession();
  const userId = session?.user.id ?? '';
  const client = useQueryClient();
  const { showNotification } = useAppNotification();
  const cart = useQuery({ queryKey: ['cart', userId], queryFn: () => getCart(userId), enabled: Boolean(userId) });
  const remove = useMutation({
    mutationFn: (variantId: string) => removeCartItem(userId, variantId),
    onSuccess: () => client.invalidateQueries({ queryKey: ['cart', userId] }),
    onError: () => showNotification({ title: 'นำสินค้าออกไม่สำเร็จ', message: 'กรุณาลองใหม่อีกครั้ง', variant: 'error' }),
  });
  const changeQuantity = useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: string; quantity: number }) => updateCartQuantity(userId, variantId, quantity),
    onSuccess: () => client.invalidateQueries({ queryKey: ['cart', userId] }),
    onError: () => showNotification({ title: 'เปลี่ยนจำนวนไม่สำเร็จ', message: 'กรุณาลองใหม่อีกครั้ง', variant: 'error' }),
  });
  const subtotal = (cart.data ?? []).reduce((total, item) => total + (item.store_variants?.price_minor ?? 0) * item.quantity, 0);
  const hasUnavailableItem = (cart.data ?? []).some((item) => !item.store_variants || item.quantity > item.store_variants.stock);
  return <ScrollView style={{ flex: 1, backgroundColor: Palette.background }} contentContainerStyle={{ padding: Spacing.five, paddingTop: insets.top + Spacing.four, gap: Spacing.four }}>
    <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace('/')}><AppText tone="brand">‹ ย้อนกลับ</AppText></Pressable>
    <AppText variant="h1">ตะกร้าสินค้า</AppText>
    {isLoading ? <FeedbackState title="กำลังตรวจสอบบัญชี" message="กรุณารอสักครู่" /> : !userId ?
      <FeedbackState title="เข้าสู่ระบบก่อน" message="เข้าสู่ระบบเพื่อดูตะกร้าสินค้า" actionLabel="เข้าสู่ระบบ" onAction={() => router.replace({ pathname: '/auth', params: { returnTo: '/cart' } })} /> :
      cart.isPending ? <FeedbackState title="กำลังโหลดตะกร้า" message="กรุณารอสักครู่" /> : cart.isError ?
        <FeedbackState title="โหลดตะกร้าไม่สำเร็จ" message="กรุณาลองใหม่อีกครั้ง" actionLabel="ลองใหม่" onAction={() => { void cart.refetch(); }} /> :
        cart.data.length === 0 ? <FeedbackState title="ตะกร้ายังว่าง" message="เลือกสินค้าที่ต้องการจากหน้าสินค้า" /> :
          cart.data.map((item) => <View key={item.variant_id} style={{ padding: Spacing.four, gap: Spacing.two, backgroundColor: Palette.surface, borderRadius: 16 }}>
            <AppText variant="h3">{item.store_variants?.products?.name ?? 'สินค้านี้ไม่พร้อมจำหน่าย'}</AppText>
            {item.store_variants && <AppText>{item.store_variants.label} · {formatMoney({ amountMinor: item.store_variants.price_minor, currency: item.store_variants.currency })} · จำนวน {item.quantity}</AppText>}
            {item.store_variants && <View style={{ flexDirection: 'row', gap: Spacing.four }}>
              <Pressable accessibilityRole="button" accessibilityLabel="ลดจำนวน" disabled={changeQuantity.isPending || item.quantity <= 1} onPress={() => changeQuantity.mutate({ variantId: item.variant_id, quantity: item.quantity - 1 })}><AppText tone="brand">−</AppText></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="เพิ่มจำนวน" disabled={changeQuantity.isPending || item.quantity >= 99 || item.quantity >= item.store_variants.stock} onPress={() => changeQuantity.mutate({ variantId: item.variant_id, quantity: item.quantity + 1 })}><AppText tone="brand">＋</AppText></Pressable>
            </View>}
            <Pressable accessibilityRole="button" disabled={remove.isPending} onPress={() => remove.mutate(item.variant_id)}><AppText tone="accent">นำออก</AppText></Pressable>
          </View>)}
    {Boolean(cart.data?.length) && <>
      {hasUnavailableItem && <View style={{ backgroundColor: Palette.mutedRose, padding: Spacing.three, borderRadius: 12 }}><AppText tone="accent">สินค้าบางรายการหมดหรือมีจำนวนไม่พอ กรุณาปรับรายการก่อนสั่งซื้อ</AppText></View>}
      <View style={{ backgroundColor: Palette.warmBeige, padding: Spacing.four, borderRadius: 16, gap: Spacing.one }}>
        <AppText tone="secondary">ยอดรวมสินค้า</AppText>
        <AppText variant="h2" tone="brand">{formatMoney({ amountMinor: subtotal, currency: 'THB' })}</AppText>
        <AppText tone="secondary">ค่าจัดส่งและยอดสุทธิจะยืนยันในหน้าสั่งซื้อ</AppText>
      </View>
      <AppButton label="ไปยืนยันคำสั่งซื้อ" disabled={hasUnavailableItem || changeQuantity.isPending || remove.isPending} onPress={() => router.push('/checkout' as never)} />
    </>}
  </ScrollView>;
}
