import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import generatePayload from 'promptpay-qr';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { useAppNotification } from '@/components/ui/app-notification';
import { FeedbackState } from '@/components/ui/feedback-state';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/features/auth/ui/auth-session-provider';
import { formatMoney } from '@/features/products/application/format-money';
import { getStoreOrder, submitStorePaymentProof } from '@/features/store/data/store-repository';

function paymentProofError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('too large') || message.includes('maximum allowed size')) return 'รูปสลิปมีขนาดใหญ่เกิน 5 MB กรุณาเลือกรูปที่เล็กลง';
  if (message.includes('already under review')) return 'ร้านได้รับสลิปนี้แล้วและกำลังตรวจสอบอยู่';
  if (message.includes('not accepting')) return 'คำสั่งซื้อนี้ไม่สามารถรับสลิปเพิ่มได้';
  return 'อัปโหลดสลิปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
}

export default function PaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams<{ orderId?: string | string[] }>();
  const normalizedOrderId = typeof orderId === 'string' ? orderId : '';
  const { session, isLoading } = useAuthSession();
  const userId = session?.user.id ?? '';
  const client = useQueryClient();
  const { showNotification } = useAppNotification();
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const order = useQuery({ queryKey: ['store-order', userId, normalizedOrderId], queryFn: () => getStoreOrder(userId, normalizedOrderId), enabled: Boolean(userId && normalizedOrderId) });
  const qrPayload = order.data?.promptpay_target && order.data.total_minor > 0
    ? generatePayload(order.data.promptpay_target, { amount: order.data.total_minor / 100 })
    : null;

  const submit = useMutation({
    mutationFn: () => {
      if (!asset || !userId || !normalizedOrderId) throw new Error('Payment proof is incomplete');
      return submitStorePaymentProof(normalizedOrderId, userId, asset);
    },
    onSuccess: async () => {
      setAsset(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['store-orders', userId] }),
        client.invalidateQueries({ queryKey: ['store-order', userId, normalizedOrderId] }),
      ]);
      showNotification({ title: 'ส่งสลิปให้ร้านแล้ว', message: 'ร้านจะตรวจสอบการชำระเงินก่อนเตรียมจัดส่งสินค้า', variant: 'success', actions: [{ label: 'ดูคำสั่งซื้อ', onPress: () => router.replace('/orders' as never) }] });
    },
    onError: (error) => showNotification({ title: 'ส่งสลิปไม่สำเร็จ', message: paymentProofError(error), variant: 'error' }),
  });

  const chooseSlip = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const selected = result.assets[0];
    if (selected.fileSize && selected.fileSize > 5 * 1024 * 1024) {
      showNotification({ title: 'รูปสลิปใหญ่เกินไป', message: 'เลือกรูปขนาดไม่เกิน 5 MB เพื่ออัปโหลด', variant: 'warning' });
      return;
    }
    setAsset(selected);
  };

  const goBack = () => router.canGoBack() ? router.back() : router.replace('/orders');
  if (isLoading || order.isPending) return <View style={styles.page}><FeedbackState title="กำลังโหลดการชำระเงิน" message="กรุณารอสักครู่" /></View>;
  if (!userId) return <View style={styles.page}><FeedbackState title="เข้าสู่ระบบก่อน" message="เข้าสู่ระบบเพื่อชำระเงิน" actionLabel="เข้าสู่ระบบ" onAction={() => router.replace({ pathname: '/auth', params: { returnTo: `/payment/${normalizedOrderId}` } })} /></View>;
  if (order.isError || !order.data) return <View style={styles.page}><FeedbackState title="ไม่พบคำสั่งซื้อ" message="กรุณากลับไปตรวจสอบรายการคำสั่งซื้อ" actionLabel="ดูคำสั่งซื้อ" onAction={() => router.replace('/orders' as never)} /></View>;

  const currentOrder = order.data;
  const canSubmit = currentOrder.status === 'awaiting_payment';
  const proof = currentOrder.store_payment_proofs[0];

  return <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.three, paddingBottom: Math.max(insets.bottom, Spacing.five) + Spacing.five }]} keyboardShouldPersistTaps="handled">
    <Pressable accessibilityRole="button" accessibilityLabel="ย้อนกลับ" onPress={goBack} style={styles.back}><MaterialCommunityIcons name="chevron-left" size={24} color={Palette.primaryDark} /><AppText tone="brand">คำสั่งซื้อของฉัน</AppText></Pressable>
    <View style={styles.heading}><AppText variant="h1">ชำระเงิน</AppText><AppText tone="secondary">สแกน QR ตามยอดนี้ แล้วอัปโหลดสลิปให้ร้านตรวจสอบ</AppText></View>

    <View style={styles.amountCard}>
      <AppText tone="secondary">ยอดที่ต้องชำระ</AppText>
      <AppText variant="display" tone="brand">{formatMoney({ amountMinor: currentOrder.total_minor, currency: 'THB' })}</AppText>
      {currentOrder.payment_reference ? <AppText variant="caption" tone="secondary">เลขอ้างอิง: {currentOrder.payment_reference}</AppText> : null}
    </View>

    {qrPayload ? <View style={styles.qrCard}>
      <View style={styles.qr}><QRCode value={qrPayload} size={200} color={Palette.textPrimary} backgroundColor={Palette.white} /></View>
      <View style={styles.qrCopy}><AppText variant="h3" tone="brand">PromptPay</AppText><AppText>{currentOrder.promptpay_display_name}</AppText><AppText selectable tone="secondary">{currentOrder.promptpay_target}</AppText></View>
    </View> : <View style={styles.warning}><MaterialCommunityIcons name="alert-circle-outline" size={21} color={Palette.danger} /><AppText style={styles.warningText}>ยังสร้าง QR ไม่ได้ กรุณาติดต่อร้านค้าพร้อมเลขอ้างอิงคำสั่งซื้อ</AppText></View>}

    {currentOrder.status === 'payment_submitted' ? <View style={styles.pendingCard}><MaterialCommunityIcons name="clock-outline" size={24} color={Palette.primaryDark} /><View style={styles.pendingCopy}><AppText variant="h3" tone="brand">กำลังรอตรวจสอบ</AppText><AppText tone="secondary">ร้านได้รับสลิปของคุณแล้ว และจะแจ้งสถานะเมื่อยืนยันการชำระเงิน</AppText>{proof?.submitted_at ? <AppText variant="caption" tone="secondary">ส่งเมื่อ {new Date(proof.submitted_at).toLocaleString('th-TH')}</AppText> : null}</View></View> : canSubmit ? <View style={styles.uploadCard}>
      <View style={styles.uploadHeader}><View><AppText variant="h3">สลิปการชำระเงิน</AppText><AppText tone="secondary">รับเฉพาะ JPG, PNG หรือ WEBP ไม่เกิน 5 MB</AppText></View>{asset ? <MaterialCommunityIcons name="check-circle" size={24} color={Palette.primaryDark} /> : null}</View>
      {asset ? <Image source={{ uri: asset.uri }} style={styles.preview} resizeMode="contain" /> : <Pressable accessibilityRole="button" onPress={() => { void chooseSlip(); }} style={styles.emptyUpload}><MaterialCommunityIcons name="image-plus" size={30} color={Palette.primaryDark} /><AppText tone="brand">เลือกรูปสลิป</AppText></Pressable>}
      <AppButton label={asset ? 'เปลี่ยนรูปสลิป' : 'เลือกรูปสลิป'} variant="secondary" disabled={submit.isPending} onPress={() => { void chooseSlip(); }} />
      <AppButton label={submit.isPending ? 'กำลังส่งสลิป...' : 'ส่งสลิปให้ร้านตรวจ'} disabled={!asset || submit.isPending} onPress={() => submit.mutate()} />
    </View> : <View style={styles.warning}><MaterialCommunityIcons name="information-outline" size={21} color={Palette.primaryDark} /><AppText style={styles.warningText}>คำสั่งซื้อนี้อยู่ในสถานะ {currentOrder.status === 'paid' ? 'ชำระเงินแล้ว' : currentOrder.status === 'shipped' ? 'จัดส่งแล้ว' : currentOrder.status === 'completed' ? 'สำเร็จแล้ว' : 'ยกเลิกแล้ว'}</AppText></View>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Palette.background },
  content: { paddingHorizontal: Spacing.five, gap: Spacing.four },
  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', marginLeft: -Spacing.two },
  heading: { gap: Spacing.one },
  amountCard: { alignItems: 'center', gap: Spacing.one, borderRadius: Radius.large, backgroundColor: Palette.softGreen, padding: Spacing.five },
  qrCard: { alignItems: 'center', gap: Spacing.three, borderRadius: Radius.card, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Spacing.five },
  qr: { borderRadius: Radius.card, backgroundColor: Palette.white, padding: Spacing.three, borderWidth: 1, borderColor: Palette.border },
  qrCopy: { alignItems: 'center', gap: Spacing.half },
  uploadCard: { gap: Spacing.three, borderRadius: Radius.card, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Spacing.four },
  uploadHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  emptyUpload: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, borderRadius: Radius.input, borderWidth: 1, borderStyle: 'dashed', borderColor: Palette.primary, backgroundColor: Palette.softGreen },
  preview: { width: '100%', height: 260, borderRadius: Radius.input, backgroundColor: Palette.background },
  pendingCard: { flexDirection: 'row', gap: Spacing.three, borderRadius: Radius.card, backgroundColor: Palette.softBlue, padding: Spacing.four },
  pendingCopy: { flex: 1, gap: Spacing.half },
  warning: { flexDirection: 'row', gap: Spacing.two, borderRadius: Radius.card, backgroundColor: Palette.softPeach, padding: Spacing.four },
  warningText: { flex: 1, color: Palette.textPrimary },
});
