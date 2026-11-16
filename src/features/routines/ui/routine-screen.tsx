import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useCallback, useState } from 'react';

import { AppButton } from '@/components/ui/app-button';
import { useAppNotification } from '@/components/ui/app-notification';
import { AppText } from '@/components/ui/app-text';
import { FeedbackState } from '@/components/ui/feedback-state';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/features/auth/ui/auth-session-provider';
import { productListQuery } from '@/features/products/application/product-queries';
import type { ProductSummary } from '@/features/products/domain/product';
import { ScreenHeader, screenContentStyle } from '@/features/products/ui/screen-shell';
import { buildDailyRoutine, buildDailyRoutineFromPlan, findCompatibleAlternatives, getCycleDay, getLocalDateKey, routinePeriodLabel, type SuggestedRoutineStep } from '@/features/routines/application/routine-plan';
import { getRoutineCheckin, getRoutineCheckinDays, saveRoutineCheckin } from '@/features/routines/data/routine-checkin-repository';
import type { RoutinePeriod } from '@/features/routines/domain/routine';
import { getActiveSkinCyclingPlan } from '@/features/routines/data/skin-cycling-plan-repository';
import { plannedDayMeta, type SkinCyclingPlanDay } from '@/features/routines/domain/skin-cycling-plan';
import { skinProfileQuery } from '@/features/skin-profile/application/skin-profile-queries';
import { getLatestScanRoutineInsight } from '@/features/skin-analysis/services/scan-routine-insight-store';

const checkinKey = (userId: string, date: string, period: RoutinePeriod) => ['routine-checkin', userId, date, period] as const;
const calendarKey = (userId: string, start: string, end: string) => ['routine-calendar', userId, start, end] as const;

type CheckinUpdate = Readonly<{
  userId: string;
  date: string;
  period: RoutinePeriod;
  completedStepIds: readonly string[];
}>;

function getCalendarDays(anchor: Date) {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  start.setDate(start.getDate() - 7);
  return Array.from({ length: 21 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function RoutineCalendar({
  dates, selectedDate, checkedDates, onboardingCompletedAt, planDays, onSelect,
}: Readonly<{ dates: readonly Date[]; selectedDate: string; checkedDates: ReadonlySet<string>; onboardingCompletedAt: string | null; planDays: ReadonlyMap<string, SkinCyclingPlanDay>; onSelect: (date: Date) => void }>) {
  const weekdays = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
  return <View style={{ gap: Spacing.two }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <AppText variant="h3" tone="brand">ปฏิทิน Skin Cycling</AppText>
      <AppText variant="caption" tone="secondary">เลื่อนดูวัน</AppText>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentOffset={{ x: 7 * 66, y: 0 }} contentContainerStyle={{ gap: 6, paddingRight: Spacing.two }}>
      {dates.map((date, index) => {
        const key = getLocalDateKey(date);
        const selected = key === selectedDate;
        const done = checkedDates.has(key);
        const planned = planDays.get(key);
        const cycleDay = planned?.dayType === 'exfoliate' ? 'active' : planned?.dayType === 'hydrate' ? 'hydration' : planned?.dayType === 'recovery' ? 'recovery' : planned?.dayType === 'rest' ? 'rest' : getCycleDay(date, onboardingCompletedAt);
        const fallbackMeta = cycleDay === 'active'
          ? { label: 'ผลัดเซลล์', color: Palette.softPeach }
          : cycleDay === 'hydration'
            ? { label: 'เติมน้ำ', color: '#DDEFE3' }
            : cycleDay === 'recovery'
              ? { label: 'พักฟื้น', color: Palette.softGreen }
              : { label: 'พักผิว', color: Palette.warmBeige };
        const cycleMeta = planned ? { ...fallbackMeta, label: plannedDayMeta[planned.dayType].label } : fallbackMeta;
        return <Pressable key={key} accessibilityRole="button" accessibilityLabel={`เลือกรูทีนวันที่ ${key}`} onPress={() => onSelect(date)} style={({ pressed }) => ({ width: 62, minHeight: 78, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: Radius.input, backgroundColor: selected ? Palette.primaryDark : Palette.surface, borderWidth: 1, borderColor: selected ? Palette.primaryDark : Palette.border, opacity: pressed ? 0.72 : 1, paddingVertical: 5 })}>
          <AppText variant="caption" tone={selected ? 'inverse' : 'secondary'}>{weekdays[date.getDay() === 0 ? 6 : date.getDay() - 1]}</AppText>
          <AppText variant="button" tone={selected ? 'inverse' : undefined}>{date.getDate()}</AppText>
          <View style={{ borderRadius: Radius.round, paddingHorizontal: 5, paddingVertical: 2, backgroundColor: selected ? 'rgba(255,255,255,0.22)' : cycleMeta.color }}><AppText variant="caption" tone={selected ? 'inverse' : 'secondary'} style={{ fontSize: 9 }}>{done ? '✓ ' : ''}{cycleMeta.label}</AppText></View>
        </Pressable>;
      })}
    </ScrollView>
  </View>;
}

function RoutineStepCard({
  step,
  completed,
  disabled,
  product,
  alternatives,
  showAlternatives,
  onToggle,
  onShowAlternatives,
  onChooseProduct,
  onOpenProduct,
}: Readonly<{
  step: SuggestedRoutineStep;
  completed: boolean;
  disabled: boolean;
  product: ProductSummary | null;
  alternatives: readonly ProductSummary[];
  showAlternatives: boolean;
  onToggle: () => void;
  onShowAlternatives: () => void;
  onChooseProduct: (product: ProductSummary | null) => void;
  onOpenProduct: (product: ProductSummary) => void;
}>) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, borderRadius: Radius.input, borderWidth: 1, borderColor: completed ? '#C8E5D1' : Palette.border, backgroundColor: completed ? Palette.softGreen : Palette.surface, padding: Spacing.three }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`ทำ ${step.title} แล้ว`}
        accessibilityState={{ checked: completed, disabled }}
        disabled={disabled}
        hitSlop={8}
        onPress={onToggle}
        style={({ pressed }) => ({ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: completed ? Palette.primaryDark : '#AAB2AC', backgroundColor: completed ? Palette.primaryDark : Palette.surface, opacity: disabled ? 0.55 : pressed ? 0.65 : 1 })}>
        {completed ? <MaterialCommunityIcons name="check" size={17} color={Palette.white} /> : null}
      </Pressable>
      <View style={{ flex: 1, gap: Spacing.one }}>
        <AppText variant="button" style={{ textDecorationLine: completed ? 'line-through' : 'none' }}>{product ? `${product.brandName} ${product.name}` : step.title}</AppText>
        <AppText variant="caption" tone="secondary">{step.reason}</AppText>
        {product ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`ดูสินค้า ${product.name}`} onPress={() => onOpenProduct(product)} style={({ pressed }) => ({ alignSelf: 'flex-start', paddingTop: Spacing.one, opacity: pressed ? 0.6 : 1 })}>
            <AppText variant="caption" tone="brand">ดูสินค้า ›</AppText>
          </Pressable>
        ) : null}
        {alternatives.length > 0 ? <Pressable accessibilityRole="button" onPress={onShowAlternatives} style={({ pressed }) => ({ alignSelf: 'flex-start', paddingTop: Spacing.one, opacity: pressed ? 0.6 : 1 })}>
          <AppText variant="caption" tone="brand">เปลี่ยนสินค้า (สารเด่นเดียวกัน) ›</AppText>
        </Pressable> : null}
        {showAlternatives ? <View style={{ gap: Spacing.one, marginTop: Spacing.one }}>
          {alternatives.map((candidate) => <Pressable key={candidate.id} accessibilityRole="button" onPress={() => onChooseProduct(candidate)} style={({ pressed }) => ({ borderRadius: Radius.small, borderWidth: 1, borderColor: Palette.border, padding: Spacing.two, opacity: pressed ? 0.6 : 1 })}>
            <AppText variant="caption">{candidate.brandName} {candidate.name}</AppText>
            <AppText variant="caption" tone="secondary">สารร่วม: {candidate.keyIngredients?.find((item) => product?.keyIngredients?.some((current) => current.trim().toLowerCase() === item.trim().toLowerCase()))}</AppText>
          </Pressable>)}
          <Pressable accessibilityRole="button" onPress={() => onChooseProduct(null)}><AppText variant="caption" tone="secondary">กลับไปใช้สินค้าที่แนะนำ</AppText></Pressable>
        </View> : null}
      </View>
    </View>
  );
}

function RoutinePeriodSection({
  period,
  steps,
  completedStepIds,
  canSave,
  isSaving,
  onToggle,
  onOpenProduct,
  products,
  selectedProducts,
  editingStepId,
  onEditProduct,
  onChooseProduct,
}: Readonly<{
  period: RoutinePeriod;
  steps: readonly SuggestedRoutineStep[];
  completedStepIds: readonly string[];
  canSave: boolean;
  isSaving: boolean;
  onToggle: (stepId: string) => void;
  onOpenProduct: (step: SuggestedRoutineStep) => void;
  products: readonly ProductSummary[];
  selectedProducts: Readonly<Record<string, ProductSummary>>;
  editingStepId: string | null;
  onEditProduct: (stepId: string) => void;
  onChooseProduct: (stepId: string, product: ProductSummary | null) => void;
}>) {
  const completed = steps.filter((step) => completedStepIds.includes(step.id)).length;
  return (
    <View style={{ gap: Spacing.three }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.two }}>
        <AppText variant="h2">{routinePeriodLabel(period)}</AppText>
        <AppText variant="caption" tone="secondary">{completed}/{steps.length} ขั้นตอน</AppText>
      </View>
      {steps.map((step) => {
        const product = selectedProducts[step.id] ?? step.product;
        return <RoutineStepCard key={step.id} step={step} product={product} alternatives={findCompatibleAlternatives(product, products, step.role)} showAlternatives={editingStepId === step.id} completed={completedStepIds.includes(step.id)} disabled={!canSave || isSaving} onToggle={() => onToggle(step.id)} onShowAlternatives={() => onEditProduct(step.id)} onChooseProduct={(choice) => onChooseProduct(step.id, choice)} onOpenProduct={(choice) => onOpenProduct({ ...step, product: choice })} />;
      })}
      {isSaving ? <AppText variant="caption" tone="secondary">กำลังบันทึกความคืบหน้า...</AppText> : null}
    </View>
  );
}

export default function RoutineScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const { isLoading: isLoadingSession, session } = useAuthSession();
  const userId = session?.user.id ?? '';
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateKey());
  const [activePeriod, setActivePeriod] = useState<RoutinePeriod>(() => new Date().getHours() >= 17 ? 'pm' : 'am');
  const [selectedProducts, setSelectedProducts] = useState<Record<string, ProductSummary>>({});
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const calendarDates = getCalendarDays(new Date());
  const calendarStart = getLocalDateKey(calendarDates[0]);
  const calendarEnd = getLocalDateKey(calendarDates[calendarDates.length - 1]);
  const { showNotification } = useAppNotification();
  const profile = useQuery({ ...skinProfileQuery(userId), enabled: Boolean(userId) });
  const latestScan = useQuery({
    queryKey: ['latest-scan-routine-insight', userId],
    queryFn: () => getLatestScanRoutineInsight(userId),
    enabled: Boolean(userId),
    staleTime: 0,
  });
  const products = useQuery(productListQuery({ limit: 30, sort: 'popular' }));
  const activePlan = useQuery({
    queryKey: ['active-skin-cycling-plan', userId],
    queryFn: () => getActiveSkinCyclingPlan(userId),
    enabled: Boolean(userId),
  });
  const refetchActivePlan = activePlan.refetch;
  useFocusEffect(useCallback(() => {
    if (userId) void refetchActivePlan();
  }, [refetchActivePlan, userId]));
  const selectedRoutineDate = new Date(`${selectedDate}T12:00:00`);
  const planDay = activePlan.data?.days.find((day) => day.routineDate === selectedDate) ?? null;
  const routine = planDay
    ? buildDailyRoutineFromPlan(products.data?.items ?? [], planDay)
    : buildDailyRoutine(profile.data ?? null, products.data?.items ?? [], selectedRoutineDate, latestScan.data ?? null);
  const plannedDays = new Map((activePlan.data?.days ?? []).map((day) => [day.routineDate, day]));
  // A catalog-only fallback would make a new account look personalized when it
  // is not. Unlock product recommendations only after a completed scan creates
  // this user's plan.
  const requiresSkinScan = Boolean(userId) && !profile.isPending && Boolean(profile.data?.onboardingCompletedAt) && !activePlan.isPending && !activePlan.data;
  const requiresPersonalPlan = Boolean(userId) && !profile.isPending && (!profile.data?.onboardingCompletedAt || requiresSkinScan);
  const calendar = useQuery({
    queryKey: calendarKey(userId, calendarStart, calendarEnd),
    queryFn: () => getRoutineCheckinDays(userId, calendarStart, calendarEnd),
    enabled: Boolean(userId),
  });
  const checkedDates = new Set((calendar.data ?? []).filter((entry) => entry.completedStepIds.length > 0).map((entry) => entry.date));
  const morning = useQuery({
    queryKey: checkinKey(userId, routine.date, 'am'),
    queryFn: () => getRoutineCheckin(userId, routine.date, 'am'),
    enabled: Boolean(userId),
  });
  const evening = useQuery({
    queryKey: checkinKey(userId, routine.date, 'pm'),
    queryFn: () => getRoutineCheckin(userId, routine.date, 'pm'),
    enabled: Boolean(userId),
  });
  const activeCheckin = activePeriod === 'am' ? morning.data?.completedStepIds ?? [] : evening.data?.completedStepIds ?? [];
  const activeSteps = activePeriod === 'am' ? routine.morning : routine.evening;
  const completedCount = activeSteps.filter((step) => activeCheckin.includes(step.id)).length;
  const progressPercent = activeSteps.length ? Math.round((completedCount / activeSteps.length) * 100) : 0;
  const save = useMutation({
    mutationFn: ({ userId: owner, date, period, completedStepIds }: CheckinUpdate) => saveRoutineCheckin(owner, date, period, completedStepIds),
    onSuccess: (_result, update) => {
      client.setQueryData(checkinKey(update.userId, update.date, update.period), { completedStepIds: update.completedStepIds });
      void client.invalidateQueries({ queryKey: ['routine-calendar', update.userId] });
    },
    onError: () => showNotification({ title: 'บันทึกรูทีนไม่สำเร็จ', message: 'กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง', variant: 'error' }),
  });

  const toggle = (period: RoutinePeriod, stepId: string) => {
    if (!userId || save.isPending) return;
    const current = period === 'am' ? morning.data?.completedStepIds ?? [] : evening.data?.completedStepIds ?? [];
    const completedStepIds = current.includes(stepId) ? current.filter((id) => id !== stepId) : [...current, stepId];
    save.mutate({ userId, date: routine.date, period, completedStepIds });
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: Palette.background }} showsVerticalScrollIndicator={false}>
      <ScreenHeader eyebrow={routine.date} title="รูทีนประจำวัน" />
      <View style={screenContentStyle}>
        {requiresPersonalPlan ? <View style={{ borderRadius: Radius.large, backgroundColor: Palette.softGreen, padding: Spacing.four, gap: Spacing.three }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: Palette.surface, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="face-recognition" size={25} color={Palette.primaryDark} />
          </View>
          <View style={{ gap: Spacing.one }}>
            <AppText variant="h2" tone="brand">{requiresSkinScan ? 'สร้างรูทีนเฉพาะคุณก่อน' : 'ตั้งค่าข้อมูลผิวก่อน'}</AppText>
            <AppText tone="secondary">{requiresSkinScan ? 'สแกนผิว 1 ครั้ง เพื่อให้ระบบจัดแผน Skin Cycling 30 วันตามสภาพผิวของคุณ' : 'ตอบข้อมูลสภาพผิวสั้น ๆ ก่อนเริ่มสร้างรูทีนส่วนตัว'}</AppText>
          </View>
          <AppButton label={requiresSkinScan ? 'เริ่มสแกนผิว' : 'ตั้งค่าข้อมูลผิว'} onPress={() => router.push(requiresSkinScan ? '/analysis' as never : { pathname: '/onboarding', params: { returnTo: '/routine' } })} />
        </View> : null}

        {!requiresPersonalPlan ? <>
        <View style={{ borderRadius: Radius.large, backgroundColor: Palette.softGreen, padding: Spacing.four, gap: Spacing.two }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ gap: 2 }}>
              <AppText variant="h3" tone="brand">{routine.cycleLabel}</AppText>
              <AppText variant="caption" tone="secondary">วันนี้ทำไปแล้ว {completedCount}/{activeSteps.length} ขั้นตอน</AppText>
            </View>
            <AppText variant="h2" tone="brand">{progressPercent}%</AppText>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.72)', overflow: 'hidden' }}><View style={{ height: '100%', width: `${progressPercent}%`, borderRadius: 4, backgroundColor: Palette.primaryDark }} /></View>
          <AppText tone="secondary">{routine.cycleDay === 'active' ? 'คืนนี้มีขั้นตอนบำรุงเพิ่มหนึ่งอย่าง ค่อย ๆ เริ่มและหยุดหากผิวระคายเคือง' : 'วันนี้เน้นขั้นตอนเรียบง่าย ให้ผิวได้รับความชุ่มชื้นอย่างสม่ำเสมอ'}</AppText>
          {routine.scanNote ? <AppText variant="caption" tone="secondary">{routine.scanNote}</AppText> : null}
        </View>

        <RoutineCalendar dates={calendarDates} selectedDate={routine.date} checkedDates={checkedDates} onboardingCompletedAt={profile.data?.onboardingCompletedAt ?? null} planDays={plannedDays} onSelect={(date) => { setSelectedDate(getLocalDateKey(date)); setEditingStepId(null); }} />

        {isLoadingSession ? <FeedbackState title="กำลังตรวจสอบบัญชี" message="กำลังเตรียมรูทีนของคุณ" /> : !userId ? (
          <FeedbackState title="เข้าสู่ระบบเพื่อบันทึกรูทีน" message="คุณยังดูขั้นตอนพื้นฐานได้ แต่การติ๊กความคืบหน้าจะบันทึกเมื่อเข้าสู่ระบบ" actionLabel="เข้าสู่ระบบ" onAction={() => router.push({ pathname: '/auth', params: { returnTo: '/routine' } })} />
        ) : null}

        {userId && !profile.isPending && !profile.data ? (
          <View style={{ borderRadius: Radius.card, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Spacing.four, gap: Spacing.two }}>
            <AppText variant="h3">ปรับรูทีนให้เข้ากับผิวคุณ</AppText>
            <AppText tone="secondary">ตอบข้อมูลสภาพผิวสั้น ๆ เพื่อให้ SkinCycle ปรับคำแนะนำพื้นฐานได้ดีขึ้น</AppText>
            <AppButton label="ตั้งค่าข้อมูลผิว" variant="secondary" onPress={() => router.push({ pathname: '/onboarding', params: { returnTo: '/routine' } })} />
          </View>
        ) : null}

        {profile.isError ? <FeedbackState title="โหลดข้อมูลผิวไม่สำเร็จ" message="กำลังแสดงรูทีนพื้นฐาน คุณสามารถลองโหลดใหม่ได้" actionLabel="ลองใหม่" onAction={() => { void profile.refetch(); }} /> : null}
        {activePlan.isError ? <FeedbackState title="โหลดแผน Skin Cycling ไม่สำเร็จ" message="กำลังแสดงรูทีนพื้นฐานชั่วคราว" actionLabel="ลองใหม่" onAction={() => { void activePlan.refetch(); }} /> : null}
        {products.isError ? <FeedbackState title="โหลดสินค้าไม่สำเร็จ" message="รูทีนยังใช้งานได้ แต่ยังจับคู่สินค้าให้ไม่ได้" actionLabel="ลองใหม่" onAction={() => { void products.refetch(); }} /> : null}

        <View style={{ flexDirection: 'row', gap: Spacing.two, padding: 4, borderRadius: Radius.input, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border }}>
          {(['am', 'pm'] as const).map((period) => {
            const selected = activePeriod === period;
            const steps = period === 'am' ? routine.morning : routine.evening;
            const done = (period === 'am' ? morning.data?.completedStepIds ?? [] : evening.data?.completedStepIds ?? []).filter((id) => steps.some((step) => step.id === id)).length;
            return <Pressable key={period} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => { setActivePeriod(period); setEditingStepId(null); }} style={{ flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.small, backgroundColor: selected ? Palette.primaryDark : Palette.surface }}>
              <AppText variant="button" tone={selected ? 'inverse' : 'secondary'}>{period === 'am' ? 'เช้า' : 'เย็น'} · {done}/{steps.length}</AppText>
            </Pressable>;
          })}
        </View>
        <RoutinePeriodSection
          period={activePeriod}
          steps={activeSteps}
          completedStepIds={activeCheckin}
          canSave={Boolean(userId) && !(activePeriod === 'am' ? morning.isPending : evening.isPending)}
          isSaving={save.isPending}
          onToggle={(stepId) => toggle(activePeriod, stepId)}
          onOpenProduct={(step) => { if (step.product) router.push({ pathname: '/product/[id]', params: { id: step.product.id } }); }}
          products={products.data?.items ?? []}
          selectedProducts={selectedProducts}
          editingStepId={editingStepId}
          onEditProduct={(stepId) => setEditingStepId((current) => current === stepId ? null : stepId)}
          onChooseProduct={(stepId, product) => { setSelectedProducts((items) => { const next = { ...items }; if (product) next[stepId] = product; else delete next[stepId]; return next; }); setEditingStepId(null); }}
        />
        <AppText variant="caption" tone="secondary">รูทีนนี้เป็นแนวทางการดูแลผิวทั่วไป ไม่ใช่การวินิจฉัยโรคผิวหนัง หากมีอาการระคายเคืองหรือผิดปกติ ควรปรึกษาแพทย์ผิวหนัง</AppText>
        </> : null}
      </View>
    </ScrollView>
  );
}
