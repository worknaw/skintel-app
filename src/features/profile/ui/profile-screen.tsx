import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { useAppNotification } from '@/components/ui/app-notification';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';
import { getProfileDisplayName } from '@/features/profile/application/profile-presenter';
import { getProtectedAuthRoute } from '@/features/auth/application/auth-session';
import { useAuthSession } from '@/features/auth/ui/auth-session-provider';
import { supabase } from '@/core/supabase/client';
import { getOrders, type StoreOrder } from '@/features/store/data/store-repository';
import { skinProfileQuery } from '@/features/skin-profile/application/skin-profile-queries';
import { loadScanHistory } from '@/features/skin-analysis/services/scan-history';
import { formatMoney } from '@/features/products/application/format-money';

type ProfileData = { display_name: string | null };

const menuItems = [
  ['face-recognition', 'สแกนผิว', '/analysis'],
  ['calendar-check-outline', 'รูทีนประจำวัน', '/routine'],
  ['heart-outline', 'รายการโปรด', '/favorites'],
  ['cart-outline', 'ตะกร้าสินค้า', '/cart'],
  ['map-marker-outline', 'ที่อยู่จัดส่ง', '/addresses'],
  ['receipt-text-outline', 'คำสั่งซื้อของฉัน', '/orders'],
  ['cog-outline', 'การตั้งค่า', '/settings'],
] as const;

const skinTypeLabels: Record<string, string> = { dry: 'ผิวแห้ง', oily: 'ผิวมัน', combination: 'ผิวผสม', normal: 'ผิวปกติ', unsure: 'ยังไม่แน่ใจ' };

function orderBuckets(orders: readonly StoreOrder[]) {
  return [
    { key: 'payment', label: 'รอชำระเงิน', icon: 'cash-clock', statuses: ['awaiting_payment'] },
    { key: 'prepare', label: 'รอจัดส่ง', icon: 'package-variant-closed', statuses: ['payment_submitted', 'paid'] },
    { key: 'shipping', label: 'กำลังจัดส่ง', icon: 'truck-delivery-outline', statuses: ['shipped'] },
    { key: 'review', label: 'รอรีวิว', icon: 'star-outline', statuses: ['completed'] },
  ].map((bucket) => ({ ...bucket, count: orders.filter((order) => bucket.statuses.includes(order.status)).length }));
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoading: isLoadingSession, session } = useAuthSession();
  const { showNotification } = useAppNotification();
  const userId = session?.user.id;
  const email = session?.user.email ?? null;
  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => {
      const result = await supabase.from('profiles').select('display_name')
        .eq('id', userId!).abortSignal(signal).maybeSingle<ProfileData>();
      if (result.error) throw result.error;
      return result.data;
    },
  });
  const profile = profileQuery.data;
  const { isStale, isFetching, isError, refetch } = profileQuery;
  const orders = useQuery({
    queryKey: ['store-orders', userId],
    queryFn: () => getOrders(userId!),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
  const skinProfile = useQuery({ ...skinProfileQuery(userId ?? ''), enabled: Boolean(userId) });
  const scans = useQuery({ queryKey: ['skin-scan-history', userId], queryFn: loadScanHistory, enabled: Boolean(userId), staleTime: 60_000 });

  useEffect(() => {
    if (profileQuery.isError) showNotification({ title: 'โหลดข้อมูลส่วนตัวไม่สำเร็จ', message: 'กรุณากลับเข้าหน้าโปรไฟล์เพื่อลองใหม่', variant: 'error' });
  }, [profileQuery.isError, showNotification]);

  useFocusEffect(useCallback(() => {
      if (isLoadingSession) return;
      if (!userId) {
        router.replace(getProtectedAuthRoute('/profile', false) as never);
        return;
      }
      if (isStale && !isFetching && !isError) void refetch();
  }, [isLoadingSession, router, userId, isStale, isFetching, isError, refetch]));

  const displayName = getProfileDisplayName(profile?.display_name, email);

  if (isLoadingSession || !userId || profileQuery.isLoading) return <View collapsable={false} style={styles.loading}><AppText tone="secondary">กำลังตรวจสอบบัญชี...</AppText></View>;

  return (
    <View collapsable={false} style={styles.page}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + 92 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AppText variant="h1" tone="brand" style={styles.pageTitle}>โปรไฟล์</AppText>
        </View>

        <View style={styles.profileCard}>
          <LinearGradient colors={['#F7FBF8', '#FFFFFF']} style={styles.avatar}>
            <AppText tone="brand" style={styles.avatarText}>{displayName.slice(0, 1)}</AppText>
          </LinearGradient>
          <View style={styles.profileInfo}>
            <AppText tone="brand" numberOfLines={1} style={styles.profileName}>{displayName}</AppText>
            <AppText tone="secondary" style={styles.profileSubtitle}>สมาชิก SkinCycle</AppText>
          </View>
          <Pressable style={styles.editButton} onPress={() => router.push('/settings-detail/profile' as never)}>
            <MaterialCommunityIcons name="pencil-outline" size={15} color={Palette.primaryDark} />
            <AppText tone="brand" style={styles.editText}>แก้ไขโปรไฟล์</AppText>
          </Pressable>
        </View>

        <View style={styles.sectionHeaderRow}>
          <AppText style={styles.sectionTitle}>คำสั่งซื้อของฉัน</AppText>
          <Pressable onPress={() => router.push('/orders' as never)}><AppText tone="brand" style={styles.linkText}>ดูทั้งหมด</AppText></Pressable>
        </View>
        <View style={styles.orderSummaryCard}>
          {orderBuckets(orders.data ?? []).map((bucket) => (
            <Pressable key={bucket.key} style={styles.orderBucket} onPress={() => router.push({ pathname: '/orders', params: { filter: bucket.key } } as never)}>
              <View style={styles.orderIcon}><MaterialCommunityIcons name={bucket.icon as never} size={18} color={Palette.primaryDark} /></View>
              <AppText style={styles.orderCount}>{orders.isPending ? '–' : bucket.count}</AppText>
              <AppText numberOfLines={1} style={styles.orderLabel}>{bucket.label}</AppText>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeaderRow}>
          <AppText style={styles.sectionTitle}>โปรไฟล์ผิวของฉัน</AppText>
          <Pressable onPress={() => router.push('/onboarding' as never)}><AppText tone="brand" style={styles.linkText}>แก้ไข</AppText></Pressable>
        </View>
        <Pressable style={styles.skinCard} onPress={() => router.push('/onboarding' as never)}>
          <View style={styles.skinCardIcon}><MaterialCommunityIcons name="face-recognition" size={22} color={Palette.primaryDark} /></View>
          <View style={styles.skinCardBody}>
            <AppText tone="brand" style={styles.cardTitle}>{skinProfile.data?.skinType ? skinTypeLabels[skinProfile.data.skinType] : 'ยังไม่ได้ตั้งค่าโปรไฟล์ผิว'}</AppText>
            <AppText tone="secondary" numberOfLines={2} style={styles.detailText}>{skinProfile.data ? `${skinProfile.data.concernIds.length} ปัญหาผิว · งบ ${skinProfile.data.monthlyBudgetMinor == null ? 'ไม่ระบุ' : formatMoney({ amountMinor: skinProfile.data.monthlyBudgetMinor, currency: skinProfile.data.budgetCurrency })}` : 'กรอกข้อมูลผิวเพื่อรับคำแนะนำที่เหมาะกับคุณ'}</AppText>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={19} color={Palette.textSecondary} />
        </Pressable>

        <View style={styles.sectionHeaderRow}>
          <AppText style={styles.sectionTitle}>Skin Scan ล่าสุด</AppText>
          <Pressable onPress={() => router.push('/analysis' as never)}><AppText tone="brand" style={styles.linkText}>ดูทั้งหมด</AppText></Pressable>
        </View>
        <Pressable style={styles.scanCard} onPress={() => router.push('/analysis' as never)}>
          <MaterialCommunityIcons name="scan-helper" size={22} color={Palette.primaryDark} />
          <View style={styles.skinCardBody}>
            <AppText tone="brand" style={styles.cardTitle}>{scans.isPending ? 'กำลังโหลดผลสแกน...' : scans.data?.[0] ? `สแกนเมื่อ ${new Date(scans.data[0].createdAt).toLocaleDateString('th-TH')}` : 'ยังไม่มีประวัติสแกน'}</AppText>
            <AppText tone="secondary" style={styles.detailText}>{scans.data?.[0]?.result.visible_acne ?? 'เริ่มสแกนเพื่อดูคำแนะนำการดูแลผิว'}</AppText>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={19} color={Palette.textSecondary} />
        </Pressable>

        <AppText style={styles.sectionTitle}>เมนูของฉัน</AppText>
        <View style={styles.menuCard}>{menuItems.map(([icon, label, route]) => <Pressable key={label} style={styles.menuRow} onPress={() => router.push(route as never)}><MaterialCommunityIcons name={icon as never} size={20} color={Palette.primaryDark} /><AppText style={styles.menuLabel}>{label}</AppText><MaterialCommunityIcons name="chevron-right" size={19} color={Palette.textSecondary} /></Pressable>)}</View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pageTitle: { fontFamily: Fonts.serif, fontWeight: '400', letterSpacing: -0.5, fontSize: 24, lineHeight: 34 },
  avatarText: { fontFamily: 'NotoSansThai_600SemiBold', fontSize: 22, lineHeight: 28 },
  profileName: { fontFamily: 'NotoSansThai_600SemiBold', fontSize: 16, lineHeight: 22, paddingRight: 105 },
  profileSubtitle: { fontSize: 12, lineHeight: 17 },
  editText: { fontFamily: 'NotoSansThai_500Medium', fontSize: 11, lineHeight: 16 },
  cardTitle: { fontFamily: 'NotoSansThai_600SemiBold', fontSize: 14, lineHeight: 20 },
  score: { fontFamily: 'NotoSansThai_600SemiBold', fontSize: 25, lineHeight: 30 },
  smallText: { fontSize: 11, lineHeight: 16 },
  detailText: { fontFamily: 'NotoSansThai_500Medium', fontSize: 11, lineHeight: 16 },
  summaryValue: { fontFamily: 'NotoSansThai_600SemiBold', fontSize: 23, lineHeight: 28 },
  metricLabel: { fontSize: 11, lineHeight: 16 },
  metricValue: { fontSize: 9, lineHeight: 14 },
  pointsTitle: { fontFamily: 'NotoSansThai_600SemiBold', fontSize: 13, lineHeight: 19 },
  pointsValue: { fontFamily: 'NotoSansThai_600SemiBold', fontSize: 23, lineHeight: 28 },
  loading: { flex: 1, backgroundColor: Palette.background, alignItems: 'center', justifyContent: 'center' }, page: { flex: 1, backgroundColor: Palette.background }, content: { paddingHorizontal: 8, gap: 9 }, header: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 12 }, profileCard: { backgroundColor: Palette.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: Palette.border, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 7, boxShadow: '0 2px 8px rgba(44,65,55,0.07)' }, avatar: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.border }, profileInfo: { flex: 1, gap: 0 }, badgeRow: { flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' }, badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 20, backgroundColor: Palette.softGreen }, orangeBadge: { backgroundColor: '#FFF2E8' }, editButton: { position: 'absolute', right: 7, top: 8, flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, borderColor: Palette.primaryDark, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 4 }, summaryRow: { flexDirection: 'row', gap: 5 }, summaryCard: { flex: 1, minHeight: 82, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.surface, borderRadius: Radius.small, borderWidth: 1, borderColor: Palette.border, padding: 4 }, centerText: { textAlign: 'center', marginTop: 2, fontSize: 10, lineHeight: 14 }, iconCircle: { width: 31, height: 31, borderRadius: 16, backgroundColor: '#F0F7F1', alignItems: 'center', justifyContent: 'center' }, iconCircleAccent: { backgroundColor: '#FFF0E5' }, card: { backgroundColor: Palette.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: Palette.border, padding: 9 }, healthBody: { flexDirection: 'row', gap: 7, marginTop: 3 }, scoreColumn: { width: 79, alignItems: 'flex-start' }, detailButton: { flexDirection: 'row', alignItems: 'center', gap: 1, backgroundColor: '#F2F8F2', borderRadius: 18, paddingHorizontal: 6, paddingVertical: 3, marginTop: 3 }, metrics: { flex: 1, gap: 4, justifyContent: 'center' }, metric: { flexDirection: 'row', alignItems: 'center', gap: 4 }, metricMain: { flex: 1 }, metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, track: { height: 5, borderRadius: 4, backgroundColor: '#EEF0ED', overflow: 'hidden', marginTop: 2 }, progress: { height: '100%', borderRadius: 4, backgroundColor: Palette.primaryDark }, sectionTitle: { marginTop: 0, fontFamily: 'NotoSansThai_600SemiBold', fontSize: 15, lineHeight: 21 }, sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, linkText: { fontSize: 11, lineHeight: 16 }, orderSummaryCard: { flexDirection: 'row', backgroundColor: Palette.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: Palette.border, paddingVertical: 10 }, orderBucket: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 2 }, orderIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: Palette.softGreen, alignItems: 'center', justifyContent: 'center' }, orderCount: { fontFamily: 'NotoSansThai_600SemiBold', fontSize: 16, lineHeight: 21, color: Palette.primaryDark }, orderLabel: { fontSize: 9, lineHeight: 14, color: Palette.textSecondary }, skinCard: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: Palette.softGreen, borderRadius: Radius.card, padding: 11 }, scanCard: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: Palette.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: Palette.border, padding: 11 }, skinCardIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: Palette.surface, alignItems: 'center', justifyContent: 'center' }, skinCardBody: { flex: 1, gap: 2 }, menuCard: { backgroundColor: Palette.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: 10 }, menuRow: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: Palette.border }, menuLabel: { flex: 1, fontSize: 12, lineHeight: 18 }, pointsCard: { minHeight: 68, borderRadius: Radius.card, borderWidth: 1, borderColor: '#F7D6BB', backgroundColor: '#FFF7EF', paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 6 }, pointsText: { flex: 1 }, pointsLine: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
});
