import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { useAppNotification } from '@/components/ui/app-notification';
import { FeedbackState } from '@/components/ui/feedback-state';
import { Palette, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/features/auth/ui/auth-session-provider';
import { formatMoney } from '@/features/products/application/format-money';
import { cancelOrder, getOrders, type StoreOrder } from '@/features/store/data/store-repository';
import { getShipmentTracking } from '@/features/store/data/shipment-tracking';

const labels: Record<string, string> = { awaiting_payment: 'รอชำระเงิน', payment_submitted: 'กำลังตรวจสอบการชำระเงิน', cancelled: 'ยกเลิกแล้ว', paid: 'ชำระเงินแล้ว', shipped: 'จัดส่งแล้ว', completed: 'สำเร็จ' };
const filterStatuses: Record<string, readonly string[]> = {
  payment: ['awaiting_payment'],
  prepare: ['payment_submitted', 'paid'],
  shipping: ['shipped'],
  review: ['completed'],
};

function canTrackOrder(order: StoreOrder) {
  const carrier = (order.shipping_carrier ?? '').toLocaleLowerCase().replace(/[\s_-]+/g, '');
  return Boolean(order.tracking_number)
    && (carrier.includes('thailandpost') || carrier.includes('ไปรษณีย์ไทย'))
    && ['shipped', 'completed'].includes(order.status);
}

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, isLoading } = useAuthSession();
  const { filter } = useLocalSearchParams<{ filter?: string | string[] }>();
  const activeFilter = typeof filter === 'string' ? filter : '';
  const userId = session?.user.id ?? '';
  const [trackingOrder, setTrackingOrder] = useState<StoreOrder | null>(null);
  const client = useQueryClient();
  const { showNotification } = useAppNotification();
  const orders = useQuery({ queryKey: ['store-orders', userId], queryFn: () => getOrders(userId), enabled: Boolean(userId) });
  const shipmentTracking = useQuery({
    queryKey: ['shipment-tracking', userId, trackingOrder?.id ?? null],
    queryFn: () => getShipmentTracking(trackingOrder!.id),
    enabled: Boolean(userId && trackingOrder?.id),
    staleTime: 30_000,
    retry: false,
  });
  const cancel = useMutation({ mutationFn: cancelOrder,
    onSuccess: () => client.invalidateQueries({ queryKey: ['store-orders', userId] }),
    onError: () => showNotification({ title: 'ยกเลิกคำสั่งซื้อไม่สำเร็จ', message: 'กรุณาลองใหม่หรือติดต่อร้านค้า', variant: 'error' }) });
  return <>
  <ScrollView style={{ flex: 1, backgroundColor: Palette.background }} contentContainerStyle={{ padding: Spacing.five, paddingTop: insets.top + Spacing.four, gap: Spacing.four }}>
    <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace('/profile')}><AppText tone="brand">‹ ย้อนกลับ</AppText></Pressable>
    <AppText variant="h1">คำสั่งซื้อของฉัน</AppText>
    {isLoading ? <FeedbackState title="กำลังตรวจสอบบัญชี" message="กรุณารอสักครู่" /> : !userId ?
      <FeedbackState title="เข้าสู่ระบบก่อน" message="เข้าสู่ระบบเพื่อดูคำสั่งซื้อ" actionLabel="เข้าสู่ระบบ" onAction={() => router.replace({ pathname: '/auth', params: { returnTo: '/orders' } })} /> :
      orders.isPending ? <FeedbackState title="กำลังโหลดคำสั่งซื้อ" message="กรุณารอสักครู่" /> : orders.isError ?
        <FeedbackState title="โหลดคำสั่งซื้อไม่สำเร็จ" message="กรุณาลองใหม่อีกครั้ง" actionLabel="ลองใหม่" onAction={() => { void orders.refetch(); }} /> :
        (filterStatuses[activeFilter] ? orders.data.filter((order) => filterStatuses[activeFilter].includes(order.status)) : orders.data).length === 0 ? <FeedbackState title={activeFilter ? 'ไม่มีคำสั่งซื้อในหมวดนี้' : 'ยังไม่มีคำสั่งซื้อ'} message="รายการสั่งซื้อจะแสดงที่นี่" /> : (filterStatuses[activeFilter] ? orders.data.filter((order) => filterStatuses[activeFilter].includes(order.status)) : orders.data).map((order) => <View key={order.id} style={{ backgroundColor: Palette.surface, borderRadius: 16, padding: Spacing.four, gap: Spacing.two }}>
          <AppText variant="h3">{labels[order.status] ?? order.status}</AppText>
          <AppText tone="secondary">{new Date(order.created_at).toLocaleDateString('th-TH')} · {order.id}</AppText>
          {order.store_order_items.map((item, index) => <AppText key={`${item.product_name}-${item.variant_label}-${index}`}>{item.product_name} · {item.variant_label} × {item.quantity}</AppText>)}
          <AppText>ยอดรวม {formatMoney({ amountMinor: order.total_minor, currency: 'THB' })}</AppText>
          {order.status === 'awaiting_payment' && order.payment_instructions ? <View style={{ backgroundColor: Palette.softGreen, borderRadius: 12, padding: Spacing.three, gap: Spacing.one }}>
            <AppText variant="h3" tone="brand">ชำระเงินตามรายละเอียดนี้</AppText>
            <AppText>{order.payment_instructions}</AppText>
            {order.payment_reference ? <AppText variant="button" tone="brand">เลขอ้างอิง: {order.payment_reference}</AppText> : null}
          </View> : null}
          {order.status === 'payment_submitted' ? <View style={{ backgroundColor: Palette.softBlue, borderRadius: 12, padding: Spacing.three, gap: Spacing.one }}><AppText variant="h3" tone="brand">ส่งสลิปให้ร้านตรวจแล้ว</AppText><AppText tone="secondary">ร้านจะตรวจสอบการชำระเงินก่อนเตรียมจัดส่ง</AppText></View> : null}
          {order.status === 'shipped' && (order.shipping_carrier || order.tracking_number) ? <View style={{ backgroundColor: Palette.softBlue, borderRadius: 12, padding: Spacing.three, gap: Spacing.one }}>
            <AppText variant="h3" tone="brand">ข้อมูลจัดส่ง</AppText>
            {order.shipping_carrier ? <AppText>{order.shipping_carrier}</AppText> : null}
            {order.tracking_number ? <AppText selectable>เลขพัสดุ: {order.tracking_number}</AppText> : null}
            {canTrackOrder(order) ? <Pressable accessibilityRole="button" onPress={() => setTrackingOrder(order)} style={({ pressed }) => ({ minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one, borderRadius: 12, backgroundColor: Palette.primaryDark, opacity: pressed ? 0.76 : 1, marginTop: Spacing.one })}>
              <MaterialCommunityIcons name="truck-fast-outline" size={18} color={Palette.white} />
              <AppText variant="button" tone="inverse">ตรวจสอบสถานะพัสดุ</AppText>
            </Pressable> : null}
          </View> : null}
          {order.status === 'completed' && canTrackOrder(order) ? <View style={{ backgroundColor: Palette.softBlue, borderRadius: 12, padding: Spacing.three, gap: Spacing.one }}>
            <AppText variant="h3" tone="brand">ข้อมูลจัดส่ง</AppText>
            <AppText>{order.shipping_carrier}</AppText>
            <AppText selectable>เลขพัสดุ: {order.tracking_number}</AppText>
            <Pressable accessibilityRole="button" onPress={() => setTrackingOrder(order)} style={({ pressed }) => ({ minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one, borderRadius: 12, backgroundColor: Palette.primaryDark, opacity: pressed ? 0.76 : 1, marginTop: Spacing.one })}>
              <MaterialCommunityIcons name="truck-fast-outline" size={18} color={Palette.white} />
              <AppText variant="button" tone="inverse">ตรวจสอบสถานะพัสดุ</AppText>
            </Pressable>
          </View> : null}
          {order.status === 'awaiting_payment' && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/payment/[orderId]', params: { orderId: order.id } } as never)}><AppText tone="brand">ชำระเงิน / ส่งสลิป</AppText></Pressable><Pressable accessibilityRole="button" disabled={cancel.isPending} onPress={() => showNotification({ title: 'ยกเลิกคำสั่งซื้อ', message: 'ต้องการยกเลิกคำสั่งซื้อนี้หรือไม่', variant: 'warning', actions: [{ label: 'กลับ', style: 'cancel' }, { label: 'ยกเลิกคำสั่งซื้อ', style: 'destructive', onPress: () => cancel.mutate(order.id) }] })}><AppText tone="accent">ยกเลิกคำสั่งซื้อ</AppText></Pressable></View>}
        </View>)}
  </ScrollView>

  <Modal visible={Boolean(trackingOrder)} transparent animationType="slide" onRequestClose={() => setTrackingOrder(null)}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,35,28,0.45)' }}>
      <View style={{ maxHeight: '84%', minHeight: '52%', backgroundColor: Palette.background, borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: Spacing.five, paddingTop: Spacing.four, paddingBottom: Math.max(insets.bottom, Spacing.four), gap: Spacing.three }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ gap: 2 }}><AppText variant="h2" tone="brand">สถานะการจัดส่ง</AppText><AppText variant="caption" tone="secondary">ไปรษณีย์ไทย</AppText></View>
          <Pressable accessibilityRole="button" accessibilityLabel="ปิด" onPress={() => setTrackingOrder(null)} hitSlop={12} style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: Palette.surface }}><MaterialCommunityIcons name="close" size={22} color={Palette.textPrimary} /></Pressable>
        </View>
        <View style={{ borderRadius: 14, backgroundColor: Palette.softGreen, padding: Spacing.three, gap: 2 }}>
          <AppText variant="caption" tone="secondary">เลขพัสดุ</AppText>
          <AppText variant="h3" tone="brand" selectable>{trackingOrder?.tracking_number}</AppText>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 0, paddingBottom: Spacing.two }} showsVerticalScrollIndicator={false}>
          {shipmentTracking.isPending || shipmentTracking.isFetching ? <View style={{ minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: Spacing.two }}><ActivityIndicator size="large" color={Palette.primaryDark} /><AppText tone="secondary">กำลังตรวจสอบกับไปรษณีย์ไทย...</AppText></View>
            : shipmentTracking.isError ? <FeedbackState title="ตรวจสอบไม่สำเร็จ" message={shipmentTracking.error instanceof Error ? shipmentTracking.error.message : 'กรุณาลองใหม่อีกครั้ง'} actionLabel="ลองใหม่" onAction={() => { void shipmentTracking.refetch(); }} />
              : shipmentTracking.data?.events.length ? <>
                <AppText variant="caption" tone="secondary" style={{ marginBottom: Spacing.three }}>อัปเดตเมื่อ {new Date(shipmentTracking.data.checkedAt).toLocaleString('th-TH')}</AppText>
                {shipmentTracking.data.events.map((event, index) => <View key={`${event.statusDate ?? 'event'}-${index}`} style={{ flexDirection: 'row', minHeight: 84 }}>
                  <View style={{ width: 24, alignItems: 'center' }}>
                    <View style={{ width: index === 0 ? 13 : 10, height: index === 0 ? 13 : 10, borderRadius: 7, backgroundColor: index === 0 ? Palette.primaryDark : '#AAB2AC', zIndex: 1, marginTop: 4 }} />
                    {index < shipmentTracking.data!.events.length - 1 ? <View style={{ position: 'absolute', top: 15, bottom: -4, width: 2, backgroundColor: Palette.border }} /> : null}
                  </View>
                  <View style={{ flex: 1, gap: 3, paddingBottom: Spacing.four, paddingLeft: Spacing.two }}>
                    <AppText variant={index === 0 ? 'button' : 'body'} tone={index === 0 ? 'brand' : undefined}>{event.statusDescription ?? (event.statusCode ? `สถานะ ${event.statusCode}` : 'อัปเดตสถานะ')}</AppText>
                    {event.location || event.postcode ? <AppText variant="caption" tone="secondary">{[event.location, event.postcode].filter(Boolean).join(' ')}</AppText> : null}
                    {event.statusDate ? <AppText variant="caption" tone="secondary">{event.statusDate}</AppText> : null}
                  </View>
                </View>)}
              </> : <FeedbackState title="ยังไม่พบข้อมูลพัสดุ" message="พัสดุอาจยังไม่เข้าสู่ระบบไปรษณีย์ไทย ลองตรวจสอบอีกครั้งภายหลัง" />}
        </ScrollView>
        {shipmentTracking.data ? <AppButton label={shipmentTracking.isFetching ? 'กำลังอัปเดต...' : 'รีเฟรชสถานะ'} variant="secondary" disabled={shipmentTracking.isFetching} onPress={() => { void shipmentTracking.refetch(); }} /> : null}
      </View>
    </View>
  </Modal>
  </>;
}
