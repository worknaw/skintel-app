import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { useAppNotification } from '@/components/ui/app-notification';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { queryClient } from '@/core/query/query-client';
import { getPostAuthRoute } from '@/features/auth/application/auth-session';
import { useAuthSession } from '@/features/auth/ui/auth-session-provider';
import { completeSkinOnboarding, getActiveSkinProfileConsent } from '@/features/skin-profile/data/supabase-skin-profile-repository';
import { skinProfileQueryKey } from '@/features/skin-profile/application/skin-profile-queries';
import type { SelfReportedSkinType } from '@/features/skin-profile/domain/skin-profile';

const skinTypes: readonly { id: SelfReportedSkinType; label: string }[] = [
  { id: 'dry', label: 'ผิวแห้ง' },
  { id: 'oily', label: 'ผิวมัน' },
  { id: 'combination', label: 'ผิวผสม' },
  { id: 'normal', label: 'ผิวปกติ' },
  { id: 'unsure', label: 'ยังไม่แน่ใจ' },
];

const concerns = [
  ['acne', 'สิว'], ['oiliness', 'ความมัน'], ['dryness', 'ผิวแห้งตึง'],
  ['redness', 'รอยแดง'], ['dark-spots', 'รอยดำ'], ['texture', 'ผิวไม่เรียบเนียน'],
] as const;

const budgets = [
  [100000, 'ไม่เกิน ฿1,000'], [250000, 'ประมาณ ฿2,500'],
  [500000, 'ประมาณ ฿5,000'], [null, 'ยังไม่กำหนด'],
] as const;

function splitAvoidIngredients(value: string): string[] {
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))].slice(0, 20);
}

export default function SkinOnboardingScreen() {
  const { session } = useAuthSession();
  return <SkinOnboardingContent key={session?.user.id ?? 'guest'} />;
}

function SkinOnboardingContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { isLoading: isLoadingSession, session } = useAuthSession();
  const userId = session?.user.id ?? '';
  const { showNotification } = useAppNotification();
  const currentUser = useRef(userId);
  useLayoutEffect(() => {
    currentUser.current = userId;
    return () => { currentUser.current = ''; };
  }, [userId]);
  const destination = getPostAuthRoute(typeof returnTo === 'string' ? returnTo : undefined);
  const [skinType, setSkinType] = useState<SelfReportedSkinType | null>(null);
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [avoidIngredients, setAvoidIngredients] = useState('');
  const [budget, setBudget] = useState<number | null>(null);
  const [acceptedVersion, setAcceptedVersion] = useState<string | null>(null);
  const consent = useQuery({ queryKey: ['skin-profile-consent'], queryFn: getActiveSkinProfileConsent, enabled: Boolean(session) });

  useEffect(() => {
    if (!isLoadingSession && !session) router.replace('/auth' as never);
  }, [isLoadingSession, router, session]);

  const mutation = useMutation({
    mutationFn: ({ draft }: { owner: string; draft: Parameters<typeof completeSkinOnboarding>[0] }) => completeSkinOnboarding(draft),
    onSuccess: async (nextProfile, variables) => {
      if (currentUser.current !== variables.owner || nextProfile.userId !== variables.owner) return;
      queryClient.setQueryData(skinProfileQueryKey(variables.owner), nextProfile);
      router.dismissTo(destination as never);
    },
    onError: (_error, variables) => {
      if (currentUser.current === variables.owner) showNotification({ title: 'บันทึกข้อมูลไม่สำเร็จ', message: 'กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง', variant: 'error' });
    },
  });

  const concernSet = useMemo(() => new Set(selectedConcerns), [selectedConcerns]);
  const toggleConcern = (id: string) => {
    setSelectedConcerns((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const submit = () => {
    if (!consent.data || acceptedVersion !== consent.data.id) {
      showNotification({ title: 'ต้องยอมรับการใช้ข้อมูล', message: 'กรุณายอมรับการใช้ข้อมูล Skin Profile ก่อนดำเนินการต่อ', variant: 'warning' });
      return;
    }
    mutation.mutate({ owner: userId, draft: { skinType, concernIds: selectedConcerns, avoidIngredientIds: splitAvoidIngredients(avoidIngredients), monthlyBudgetMinor: budget, consentVersionId: consent.data.id } });
  };

  if (isLoadingSession || !session) return <View style={styles.loading}><AppText tone="secondary">กำลังเตรียมข้อมูล...</AppText></View>;

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.six }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}><MaterialCommunityIcons name="face-woman-outline" size={22} color={Palette.primaryDark} /></View>
          <View style={styles.headerCopy}>
            <AppText variant="h2" tone="brand">เริ่มต้นรู้จักผิวของคุณ</AppText>
            <AppText tone="secondary" style={styles.supporting}>ข้อมูลนี้ใช้ปรับคำแนะนำใน SkinCycle ให้เหมาะกับคุณ</AppText>
          </View>
        </View>

        <Section title="สภาพผิวของคุณ" optional>
          <View style={styles.chipGroup}>{skinTypes.map((item) => <ChoiceChip key={item.id} label={item.label} selected={skinType === item.id} onPress={() => setSkinType(item.id)} />)}</View>
        </Section>
        <Section title="ปัญหาผิวที่สนใจ" optional>
          <View style={styles.chipGroup}>{concerns.map(([id, label]) => <ChoiceChip key={id} label={label} selected={concernSet.has(id)} onPress={() => toggleConcern(id)} />)}</View>
        </Section>
        <Section title="ส่วนผสมที่ต้องการหลีกเลี่ยง" optional>
          <TextInput
            accessibilityLabel="ส่วนผสมที่ต้องการหลีกเลี่ยง"
            autoCapitalize="words"
            maxLength={500}
            onChangeText={setAvoidIngredients}
            placeholder="ตัวอย่าง Fragrance, Alcohol"
            placeholderTextColor="#9AA19C"
            style={styles.textInput}
            value={avoidIngredients}
          />
          <AppText tone="secondary" style={styles.hint}>คั่นแต่ละส่วนผสมด้วยเครื่องหมายจุลภาค</AppText>
        </Section>
        <Section title="งบประมาณสกินแคร์ต่อเดือน" optional>
          <View style={styles.chipGroup}>{budgets.map(([value, label]) => <ChoiceChip key={label} label={label} selected={budget === value} onPress={() => setBudget(value)} />)}</View>
        </Section>

        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: Boolean(consent.data && acceptedVersion === consent.data.id) }} onPress={() => setAcceptedVersion((value) => value === consent.data?.id ? null : consent.data?.id ?? null)} style={styles.consentRow}>
          <View style={[styles.checkbox, consent.data && acceptedVersion === consent.data.id && styles.checked]}>{consent.data && acceptedVersion === consent.data.id ? <MaterialCommunityIcons name="check" size={15} color={Palette.white} /> : null}</View>
          <View style={styles.consentCopy}>
            <AppText style={styles.consentTitle}>{consent.data?.title ?? 'การใช้ข้อมูล Skin Profile'}</AppText>
            <AppText tone="secondary" style={styles.consentDetail}>{consent.data?.body ?? (consent.isError ? 'โหลดข้อความความยินยอมไม่สำเร็จ กรุณาลองใหม่' : 'กำลังโหลดข้อความความยินยอม...')}</AppText>
          </View>
        </Pressable>
        {consent.isError && <AppButton label="ลองโหลดข้อความอีกครั้ง" variant="secondary" onPress={() => { void consent.refetch(); }} />}
        <AppButton disabled={mutation.isPending || !consent.data} label={mutation.isPending ? 'กำลังบันทึก...' : 'บันทึกและเริ่มต้นใช้งาน'} onPress={submit} icon={<MaterialCommunityIcons name="check-circle-outline" size={19} color={Palette.white} />} />
      </ScrollView>
    </View>
  );
}

function Section({ title, optional, children }: Readonly<{ title: string; optional?: boolean; children: ReactNode }>) {
  return <View style={styles.section}><View style={styles.sectionHeader}><AppText style={styles.sectionTitle}>{title}</AppText>{optional ? <AppText tone="secondary" style={styles.optional}>ไม่บังคับ</AppText> : null}</View>{children}</View>;
}

function ChoiceChip({ label, selected, onPress }: Readonly<{ label: string; selected: boolean; onPress: () => void }>) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={onPress} style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}><AppText tone={selected ? 'inverse' : 'secondary'} style={styles.chipText}>{label}</AppText></Pressable>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Palette.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.background },
  content: { paddingHorizontal: Spacing.five, gap: Spacing.four },
  header: { borderRadius: Radius.card, padding: Spacing.four, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  headerIcon: { width: 45, height: 45, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.softGreen },
  headerCopy: { flex: 1, gap: 2 },
  supporting: { fontSize: 12, lineHeight: 18 },
  section: { gap: Spacing.two },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: 'NotoSansThai_600SemiBold', fontSize: 15, lineHeight: 22 },
  optional: { fontSize: 11, lineHeight: 16 },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 13, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.round, backgroundColor: Palette.surface },
  chipSelected: { borderColor: Palette.primaryDark, backgroundColor: Palette.primaryDark },
  chipText: { fontSize: 12, lineHeight: 17 },
  textInput: { minHeight: 48, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.input, backgroundColor: Palette.surface, paddingHorizontal: 13, fontFamily: 'NotoSansThai_400Regular', fontSize: 13, color: Palette.textPrimary },
  hint: { fontSize: 10, lineHeight: 15, marginTop: -3 },
  consentRow: { flexDirection: 'row', gap: Spacing.two, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.card, backgroundColor: Palette.surface, padding: Spacing.three },
  checkbox: { width: 21, height: 21, borderRadius: 5, borderWidth: 1, borderColor: '#BFC8BE', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checked: { backgroundColor: Palette.primaryDark, borderColor: Palette.primaryDark },
  consentCopy: { flex: 1, gap: 2 },
  consentTitle: { fontFamily: 'NotoSansThai_500Medium', fontSize: 12, lineHeight: 18 },
  consentDetail: { fontSize: 10, lineHeight: 15 },
  pressed: { opacity: 0.7 },
});
