import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { useAppNotification } from '@/components/ui/app-notification';
import { AppText } from '@/components/ui/app-text';
import { FeedbackState } from '@/components/ui/feedback-state';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/features/auth/ui/auth-session-provider';
import { formatMoney } from '@/features/products/application/format-money';
import {
  createStoreOrder,
  getAddresses,
  getCart,
  getStoreCheckoutConfig,
  getStoreVariant,
  type DirectCheckoutItem,
} from '@/features/store/data/store-repository';

function checkoutErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('Checkout is unavailable')) return 'ร้านยังไม่เปิดรับคำสั่งซื้อ กรุณาลองใหม่ภายหลัง';
  if (message.includes('Cart is empty')) return 'ตะกร้าสินค้าของคุณว่างอยู่';
  if (message.includes('Address not found')) return 'ไม่พบที่อยู่จัดส่ง กรุณาเลือกที่อยู่อีกครั้ง';
  if (message.includes('Item unavailable') || message.includes('insufficient stock')) return 'สินค้าบางรายการหมดหรือจำนวนคงเหลือเปลี่ยนไป กรุณาตรวจสอบอีกครั้ง';
  return 'สร้างคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
}

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { variantId } = useLocalSearchParams<{ variantId?: string | string[] }>();
  const directVariantId = typeof variantId === 'string' ? variantId : '';
  const isBuyNow = Boolean(directVariantId);
  const { session, isLoading } = useAuthSession();
  const userId = session?.user.id ?? '';
  const client = useQueryClient();
  const { showNotification } = useAppNotification();
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [directQuantity, setDirectQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'promptpay'>('promptpay');

  const addresses = useQuery({ queryKey: ['shipping-addresses', userId], queryFn: () => getAddresses(userId), enabled: Boolean(userId) });
  const config = useQuery({ queryKey: ['store-checkout-config'], queryFn: getStoreCheckoutConfig, enabled: Boolean(userId) });
  const cart = useQuery({ queryKey: ['cart', userId], queryFn: () => getCart(userId), enabled: Boolean(userId) && !isBuyNow });
  const directVariant = useQuery({ queryKey: ['store-variant', directVariantId], queryFn: () => getStoreVariant(directVariantId), enabled: Boolean(userId) && isBuyNow });

  const activeAddressId = addresses.data?.some((address) => address.id === selectedAddressId)
    ? selectedAddressId
    : (addresses.data?.[0]?.id ?? '');

  const items = useMemo(() => {
    if (isBuyNow) {
      if (!directVariant.data) return [];
      return [{
        id: directVariant.data.id,
        name: directVariant.data.products?.name ?? 'สินค้า SkinCycle',
        label: directVariant.data.label,
        priceMinor: directVariant.data.price_minor,
        currency: directVariant.data.currency,
        stock: directVariant.data.stock,
        quantity: directQuantity,
      }];
    }
    return (cart.data ?? []).flatMap((item) => item.store_variants ? [{
      id: item.variant_id,
      name: item.store_variants.products?.name ?? 'สินค้า SkinCycle',
      label: item.store_variants.label,
      priceMinor: item.store_variants.price_minor,
      currency: item.store_variants.currency,
      stock: item.store_variants.stock,
      quantity: item.quantity,
    }] : []);
  }, [cart.data, directQuantity, directVariant.data, isBuyNow]);
  const subtotal = items.reduce((total, item) => total + item.priceMinor * item.quantity, 0);
  const shippingFee = config.data?.shipping_fee_minor ?? null;
  const total = shippingFee === null ? null : subtotal + shippingFee;
  const hasUnavailableItem = items.some((item) => item.stock < item.quantity);
  const isLoadingItems = isBuyNow ? directVariant.isPending : cart.isPending;
  const hasItemLoadError = isBuyNow ? directVariant.isError : cart.isError;
  const paymentInstructions = config.data?.payment_instructions?.trim() ?? '';
  const canSubmit = Boolean(activeAddressId) && items.length > 0 && !hasUnavailableItem && config.data?.checkout_enabled === true && Boolean(paymentInstructions) && paymentMethod === 'promptpay';

  const createOrder = useMutation({
    mutationFn: ({ addressId, directItems }: { addressId: string; directItems?: readonly DirectCheckoutItem[] }) => createStoreOrder(addressId, directItems),
    onSuccess: async (orderId) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['cart', userId] }),
        client.invalidateQueries({ queryKey: ['store-orders', userId] }),
        client.invalidateQueries({ queryKey: ['store-variants'] }),
        client.invalidateQueries({ queryKey: ['store-variant', directVariantId] }),
      ]);
      showNotification({ title: 'สร้างคำสั่งซื้อแล้ว', message: 'สแกน QR และส่งสลิปให้ร้านตรวจสอบเพื่อเริ่มเตรียมจัดส่งสินค้า', variant: 'success', actions: [
        { label: 'ไปชำระเงิน', onPress: () => router.replace({ pathname: '/payment/[orderId]', params: { orderId } } as never) },
      ] });
    },
    onError: (error) => showNotification({ title: 'ดำเนินการไม่สำเร็จ', message: checkoutErrorMessage(error), variant: 'error' }),
  });

  const checkoutRoute = isBuyNow ? `/checkout?variantId=${encodeURIComponent(directVariantId)}` : '/checkout';
  const addAddress = () => router.push({ pathname: '/addresses', params: { returnTo: checkoutRoute } } as never);
  const submit = () => {
    if (!canSubmit || createOrder.isPending) return;
    createOrder.mutate({
      addressId: activeAddressId,
      directItems: isBuyNow ? [{ variantId: directVariantId, quantity: directQuantity }] : undefined,
    });
  };

  return <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.three, paddingBottom: Math.max(insets.bottom, Spacing.five) + Spacing.five }]} keyboardShouldPersistTaps="handled">
    <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace('/cart')} style={styles.back}>
      <MaterialCommunityIcons name="chevron-left" size={22} color={Palette.primaryDark} />
      <AppText tone="brand">ย้อนกลับ</AppText>
    </Pressable>
    <View style={styles.hero}>
      <AppText variant="h1">ยืนยันคำสั่งซื้อ</AppText>
      <AppText tone="secondary">{isBuyNow ? 'ซื้อสินค้านี้ทันทีจาก SkinCycle' : 'ตรวจสอบที่อยู่และรายการของคุณก่อนสั่งซื้อ'}</AppText>
    </View>

    {isLoading ? <FeedbackState title="กำลังตรวจสอบบัญชี" message="กรุณารอสักครู่" /> : !userId ?
      <FeedbackState title="เข้าสู่ระบบก่อน" message="เข้าสู่ระบบเพื่อสั่งซื้อสินค้า" actionLabel="เข้าสู่ระบบ" onAction={() => router.replace({ pathname: '/auth', params: { returnTo: checkoutRoute } })} /> : <>
        <View style={styles.sectionHeader}>
          <AppText variant="h2">ที่อยู่จัดส่ง</AppText>
          <Pressable accessibilityRole="button" onPress={addAddress}><AppText tone="brand">จัดการที่อยู่</AppText></Pressable>
        </View>
        {addresses.isPending ? <FeedbackState title="กำลังโหลดที่อยู่" message="กรุณารอสักครู่" /> : addresses.isError ?
          <FeedbackState title="โหลดที่อยู่ไม่สำเร็จ" message="กรุณาลองใหม่อีกครั้ง" actionLabel="ลองใหม่" onAction={() => { void addresses.refetch(); }} /> : addresses.data.length === 0 ?
            <View style={styles.emptyCard}><AppText variant="h3">เพิ่มที่อยู่สำหรับจัดส่ง</AppText><AppText tone="secondary">ต้องมีที่อยู่ก่อนจึงจะสร้างคำสั่งซื้อได้</AppText><AppButton label="เพิ่มที่อยู่" onPress={addAddress} /></View> :
            <View style={styles.addressList}>{addresses.data.map((address) => {
              const selected = activeAddressId === address.id;
              return <Pressable key={address.id} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setSelectedAddressId(address.id)} style={[styles.addressCard, selected && styles.addressCardSelected]}>
                <MaterialCommunityIcons name={selected ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={selected ? Palette.primaryDark : Palette.textSecondary} />
                <View style={styles.addressContent}><AppText variant="h3">{address.recipient} · {address.phone}</AppText><AppText tone="secondary">{address.address_line} {address.subdistrict} {address.district} {address.province} {address.postal_code}</AppText></View>
              </Pressable>;
            })}</View>}

        <View style={styles.sectionHeader}><AppText variant="h2">รายการสินค้า</AppText><AppText tone="secondary">{isBuyNow ? 'ซื้อเลย' : 'จากตะกร้า'}</AppText></View>
        {isLoadingItems ? <FeedbackState title="กำลังโหลดสินค้า" message="กรุณารอสักครู่" /> : hasItemLoadError ?
          <FeedbackState title="โหลดสินค้าไม่สำเร็จ" message="กรุณาลองใหม่อีกครั้ง" actionLabel="ลองใหม่" onAction={() => { void (isBuyNow ? directVariant.refetch() : cart.refetch()); }} /> : items.length === 0 ?
            <View style={styles.emptyCard}><AppText variant="h3">ยังไม่มีสินค้าที่สั่งซื้อ</AppText><AppText tone="secondary">เลือกสินค้าจากหน้าร้านหรือตะกร้าสินค้าก่อน</AppText></View> :
            <View style={styles.itemList}>{items.map((item) => <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemText}><AppText variant="h3">{item.name}</AppText><AppText tone="secondary">{item.label}</AppText><AppText tone="brand">{formatMoney({ amountMinor: item.priceMinor, currency: item.currency })}</AppText></View>
              {isBuyNow ? <View style={styles.quantityControl}>
                <Pressable accessibilityRole="button" accessibilityLabel="ลดจำนวน" disabled={directQuantity <= 1 || createOrder.isPending} onPress={() => setDirectQuantity((value) => Math.max(1, value - 1))} style={styles.quantityButton}><AppText tone="brand">−</AppText></Pressable>
                <AppText>{directQuantity}</AppText>
                <Pressable accessibilityRole="button" accessibilityLabel="เพิ่มจำนวน" disabled={directQuantity >= item.stock || createOrder.isPending} onPress={() => setDirectQuantity((value) => Math.min(item.stock, value + 1))} style={styles.quantityButton}><AppText tone="brand">＋</AppText></Pressable>
              </View> : <AppText tone="secondary">× {item.quantity}</AppText>}
            </View>)}</View>}

        {hasUnavailableItem ? <View style={styles.warning}><MaterialCommunityIcons name="alert-circle-outline" size={20} color={Palette.danger} /><AppText style={styles.warningText}>สินค้าบางรายการมีจำนวนคงเหลือไม่พอ กรุณากลับไปปรับรายการ</AppText></View> : null}
        <View style={styles.summaryCard}>
          <SummaryLine label="ยอดสินค้า" value={formatMoney({ amountMinor: subtotal, currency: 'THB' })} />
          <SummaryLine label="ค่าจัดส่ง" value={shippingFee === null ? 'กำลังตั้งค่า' : formatMoney({ amountMinor: shippingFee, currency: 'THB' })} />
          <View style={styles.summaryDivider} />
          <SummaryLine label="ยอดรวม" value={total === null ? 'รอยืนยัน' : formatMoney({ amountMinor: total, currency: 'THB' })} emphasized />
        </View>
        {config.data?.checkout_enabled && paymentInstructions ? <View style={styles.paymentSection}>
          <AppText variant="h2">เลือกวิธีชำระเงิน</AppText>
          <Pressable accessibilityRole="radio" accessibilityState={{ selected: paymentMethod === 'promptpay' }} onPress={() => setPaymentMethod('promptpay')} style={[styles.paymentMethod, paymentMethod === 'promptpay' && styles.paymentMethodSelected]}>
            <View style={styles.paymentMethodIcon}><MaterialCommunityIcons name="qrcode-scan" size={23} color={Palette.primaryDark} /></View>
            <View style={styles.paymentMethodCopy}><AppText variant="h3">PromptPay QR</AppText><AppText tone="secondary">สร้าง QR ตามยอดจริงหลังยืนยันคำสั่งซื้อ</AppText></View>
            <MaterialCommunityIcons name={paymentMethod === 'promptpay' ? 'radiobox-marked' : 'radiobox-blank'} size={23} color={Palette.primaryDark} />
          </Pressable>
        </View> : null}
        {config.isPending ? <AppText tone="secondary">กำลังตรวจสอบการเปิดรับคำสั่งซื้อ</AppText> : config.isError ?
          <AppText tone="accent">ยังตรวจสอบการเปิดรับคำสั่งซื้อไม่ได้ กรุณาลองใหม่อีกครั้ง</AppText> : !config.data?.checkout_enabled ?
            <View style={styles.warning}><MaterialCommunityIcons name="store-off-outline" size={20} color={Palette.danger} /><AppText style={styles.warningText}>ร้านยังไม่เปิดรับคำสั่งซื้อ</AppText></View> : null}
        <AppButton label={createOrder.isPending ? 'กำลังสร้างคำสั่งซื้อ...' : 'ยืนยันคำสั่งซื้อ'} disabled={!canSubmit || createOrder.isPending} onPress={submit} />
      </>}
  </ScrollView>;
}

function SummaryLine({ label, value, emphasized = false }: Readonly<{ label: string; value: string; emphasized?: boolean }>) {
  return <View style={styles.summaryLine}><AppText variant={emphasized ? 'h3' : 'body'}>{label}</AppText><AppText variant={emphasized ? 'h3' : 'body'} tone={emphasized ? 'brand' : 'primary'}>{value}</AppText></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Palette.background },
  content: { paddingHorizontal: Spacing.five, gap: Spacing.three },
  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', marginLeft: -Spacing.two },
  hero: { gap: Spacing.one, marginBottom: Spacing.one },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.two },
  addressList: { gap: Spacing.two },
  addressCard: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start', backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.card, padding: Spacing.four },
  addressCardSelected: { backgroundColor: Palette.softGreen, borderColor: Palette.primary },
  addressContent: { flex: 1, gap: Spacing.half },
  itemList: { gap: Spacing.two },
  itemCard: { backgroundColor: Palette.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: Palette.border, padding: Spacing.four, flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  itemText: { flex: 1, gap: Spacing.half },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  quantityButton: { minWidth: 34, minHeight: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.softGreen, borderRadius: Radius.round },
  emptyCard: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.card, padding: Spacing.four, gap: Spacing.two },
  summaryCard: { backgroundColor: Palette.warmBeige, borderRadius: Radius.card, padding: Spacing.four, gap: Spacing.two, marginTop: Spacing.two },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  summaryDivider: { height: 1, backgroundColor: Palette.border, marginVertical: Spacing.one },
  paymentSection: { gap: Spacing.two, marginTop: Spacing.two },
  paymentMethod: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.card, backgroundColor: Palette.surface, padding: Spacing.three },
  paymentMethodSelected: { borderColor: Palette.primaryDark, backgroundColor: Palette.softGreen },
  paymentMethodIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.round, backgroundColor: Palette.surface },
  paymentMethodCopy: { flex: 1, gap: Spacing.half },
  warning: { backgroundColor: Palette.mutedRose, borderRadius: Radius.small, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  warningText: { flex: 1, color: Palette.danger },
});
