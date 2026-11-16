import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { useAppNotification } from '@/components/ui/app-notification';
import { FeedbackState } from '@/components/ui/feedback-state';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/features/auth/ui/auth-session-provider';
import { getPostAuthRoute } from '@/features/auth/application/auth-session';
import { deleteAddress, getAddresses, saveAddress, setDefaultAddress, type AddressDraft, type ShippingAddress } from '@/features/store/data/store-repository';

const empty: AddressDraft = { recipient: '', phone: '', address_line: '', subdistrict: '', district: '', province: '', postal_code: '' };
const fields: readonly { key: 'recipient' | 'phone' | 'address_line' | 'subdistrict' | 'district' | 'province' | 'postal_code'; label: string; max: number }[] = [
  { key: 'recipient', label: 'ชื่อผู้รับ', max: 120 }, { key: 'phone', label: 'เบอร์โทรศัพท์', max: 30 },
  { key: 'address_line', label: 'บ้านเลขที่ ถนน และรายละเอียดที่อยู่', max: 500 },
  { key: 'subdistrict', label: 'ตำบล / แขวง', max: 120 }, { key: 'district', label: 'อำเภอ / เขต', max: 120 },
  { key: 'province', label: 'จังหวัด', max: 120 }, { key: 'postal_code', label: 'รหัสไปรษณีย์', max: 5 },
];
const defaultRegion: Region = { latitude: 13.7563, longitude: 100.5018, latitudeDelta: 0.12, longitudeDelta: 0.12 };
type Coordinate = Readonly<{ latitude: number; longitude: number }>;
const mapsAvailable = Constants.expoConfig?.extra?.mapsAvailable === true;

function addressCoordinate(address: ShippingAddress): Coordinate | null {
  return typeof address.latitude === 'number' && typeof address.longitude === 'number'
    ? { latitude: address.latitude, longitude: address.longitude }
    : null;
}

export default function AddressesScreen() {
  const { session, isLoading } = useAuthSession();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  return <AddressesContent key={session?.user.id ?? 'guest'} userId={session?.user.id ?? ''} isLoading={isLoading} returnTo={typeof returnTo === 'string' ? returnTo : undefined} />;
}

function AddressesContent({ userId, isLoading, returnTo }: { userId: string; isLoading: boolean; returnTo?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const { showNotification } = useAppNotification();
  const [draft, setDraft] = useState<AddressDraft>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [coordinate, setCoordinate] = useState<Coordinate | null>(null);
  const [region, setRegion] = useState<Region>(defaultRegion);
  const query = useQuery({ queryKey: ['shipping-addresses', userId], queryFn: () => getAddresses(userId), enabled: Boolean(userId) });
  const save = useMutation({ mutationFn: ({ data, id }: { data: AddressDraft; id?: string }) => saveAddress(userId, data, id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['shipping-addresses', userId] });
      setDraft(empty); setEditing(null); setShowForm(false); setIsDefault(false); setCoordinate(null); setRegion(defaultRegion);
      if (returnTo) router.replace(getPostAuthRoute(returnTo) as never);
    },
    onError: () => showNotification({ title: 'บันทึกที่อยู่ไม่สำเร็จ', message: 'กรุณาลองใหม่อีกครั้ง', variant: 'error' }) });
  const remove = useMutation({ mutationFn: (id: string) => deleteAddress(userId, id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['shipping-addresses', userId] }),
    onError: () => showNotification({ title: 'ลบที่อยู่ไม่สำเร็จ', message: 'กรุณาลองใหม่อีกครั้ง', variant: 'error' }) });
  const makeDefault = useMutation({ mutationFn: setDefaultAddress,
    onSuccess: () => client.invalidateQueries({ queryKey: ['shipping-addresses', userId] }),
    onError: () => showNotification({ title: 'ตั้งค่าที่อยู่หลักไม่สำเร็จ', message: 'กรุณาลองใหม่อีกครั้ง', variant: 'error' }) });
  const applyCoordinate = (nextCoordinate: Coordinate) => {
    setCoordinate(nextCoordinate);
    setRegion((current) => ({ ...current, ...nextCoordinate }));
  };
  const openCreate = () => {
    setDraft(empty); setEditing(null); setIsDefault((query.data?.length ?? 0) === 0); setCoordinate(null); setRegion(defaultRegion); setShowForm(true);
  };
  const edit = (address: ShippingAddress) => {
    const { id, latitude: _latitude, longitude: _longitude, is_default: addressIsDefault, ...data } = address;
    const nextCoordinate = addressCoordinate(address);
    setDraft(data); setEditing(id); setIsDefault(Boolean(addressIsDefault)); setCoordinate(nextCoordinate);
    setRegion(nextCoordinate ? { ...defaultRegion, ...nextCoordinate } : defaultRegion); setShowForm(true);
  };
  const requestCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      showNotification({ title: 'ยังไม่ได้อนุญาตตำแหน่ง', message: 'คุณยังกรอกที่อยู่เองได้ หรืออนุญาตตำแหน่งในตั้งค่าเครื่อง', variant: 'warning' });
      return;
    }
    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      applyCoordinate({ latitude: location.coords.latitude, longitude: location.coords.longitude });
    } catch {
      showNotification({ title: 'ระบุตำแหน่งไม่สำเร็จ', message: 'กรุณาลองใหม่ หรือตำแหน่งบนแผนที่ด้วยตนเอง', variant: 'error' });
    }
  };
  const submit = () => {
    const clean: AddressDraft = {
      recipient: draft.recipient.trim(), phone: draft.phone.trim(), address_line: draft.address_line.trim(),
      subdistrict: draft.subdistrict.trim(), district: draft.district.trim(), province: draft.province.trim(), postal_code: draft.postal_code.trim(),
      latitude: coordinate?.latitude ?? null, longitude: coordinate?.longitude ?? null, is_default: isDefault,
    };
    if ([clean.recipient, clean.phone, clean.address_line, clean.subdistrict, clean.district, clean.province, clean.postal_code].some((value) => !value) || !/^\d{5}$/.test(clean.postal_code) || clean.phone.length < 6) {
      showNotification({ title: 'กรุณาตรวจสอบที่อยู่', message: 'กรอกข้อมูลให้ครบ เบอร์โทรศัพท์อย่างน้อย 6 ตัวอักษร และรหัสไปรษณีย์ 5 หลัก', variant: 'warning' }); return;
    }
    save.mutate({ data: clean, id: editing ?? undefined });
  };
  return <View style={{ flex: 1, backgroundColor: Palette.background }}><ScrollView contentContainerStyle={{ padding: Spacing.five, paddingTop: insets.top + Spacing.four, paddingBottom: showForm ? 100 + insets.bottom : insets.bottom + Spacing.five, gap: Spacing.four }} keyboardShouldPersistTaps="handled">
    <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace('/profile')}><AppText tone="brand">‹ ย้อนกลับ</AppText></Pressable>
    <AppText variant="h1">ที่อยู่จัดส่ง</AppText>
    {isLoading ? <FeedbackState title="กำลังตรวจสอบบัญชี" message="กรุณารอสักครู่" /> : !userId ?
      <FeedbackState title="เข้าสู่ระบบก่อน" message="เข้าสู่ระบบเพื่อจัดการที่อยู่" actionLabel="เข้าสู่ระบบ" onAction={() => router.replace({ pathname: '/auth', params: { returnTo: '/addresses' } })} /> :
      query.isPending ? <FeedbackState title="กำลังโหลดที่อยู่" message="กรุณารอสักครู่" /> : query.isError ?
        <FeedbackState title="โหลดที่อยู่ไม่สำเร็จ" message="กรุณาลองใหม่อีกครั้ง" actionLabel="ลองใหม่" onAction={() => { void query.refetch(); }} /> : <>
          {query.data.length === 0 && !showForm && <FeedbackState title="ยังไม่มีที่อยู่" message="เพิ่มที่อยู่เพื่อเตรียมการจัดส่ง" />}
          {query.data.map((address) => <View key={address.id} style={{ backgroundColor: Palette.surface, borderRadius: Radius.card, padding: Spacing.four, gap: Spacing.two, borderWidth: address.is_default ? 1 : 0, borderColor: Palette.primary }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }}><AppText variant="h3">{address.recipient} · {address.phone}</AppText>{address.is_default ? <View style={{ borderRadius: Radius.round, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, backgroundColor: Palette.softGreen }}><AppText variant="caption" tone="brand">ที่อยู่หลัก</AppText></View> : null}</View>
            <AppText>{address.address_line} {address.subdistrict} {address.district} {address.province} {address.postal_code}</AppText>
            <View style={{ flexDirection: 'row', gap: Spacing.four }}>
              {!address.is_default ? <Pressable accessibilityRole="button" disabled={makeDefault.isPending} onPress={() => makeDefault.mutate(address.id)}><AppText tone="brand">ตั้งเป็นที่อยู่หลัก</AppText></Pressable> : null}
              <Pressable accessibilityRole="button" onPress={() => edit(address)}><AppText tone="brand">แก้ไข</AppText></Pressable>
              <Pressable accessibilityRole="button" disabled={remove.isPending} onPress={() => showNotification({ title: 'ลบที่อยู่', message: 'ต้องการลบที่อยู่นี้หรือไม่', variant: 'warning', actions: [{ label: 'ยกเลิก', style: 'cancel' }, { label: 'ลบ', style: 'destructive', onPress: () => remove.mutate(address.id) }] })}><AppText tone="accent">ลบ</AppText></Pressable>
            </View>
          </View>)}
          {!showForm ? <AppButton label="เพิ่มที่อยู่" onPress={openCreate} /> : <View style={{ gap: Spacing.three }}>
            <AppText variant="h3">{editing ? 'แก้ไขที่อยู่' : 'เพิ่มที่อยู่'}</AppText>
            {fields.map((field) => <View key={field.key} style={{ gap: Spacing.one }}><AppText>{field.label}</AppText><TextInput accessibilityLabel={field.label} value={draft[field.key]} onChangeText={(value) => setDraft((current) => ({ ...current, [field.key]: value }))} maxLength={field.max} keyboardType={field.key === 'phone' || field.key === 'postal_code' ? 'phone-pad' : 'default'} multiline={field.key === 'address_line'} numberOfLines={field.key === 'address_line' ? 3 : 1} textAlignVertical={field.key === 'address_line' ? 'top' : 'center'} style={{ minHeight: field.key === 'address_line' ? 84 : 48, backgroundColor: Palette.surface, borderColor: Palette.border, borderWidth: 1, borderRadius: Radius.small, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, color: Palette.textPrimary }} /></View>)}
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: isDefault }} onPress={() => setIsDefault(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: Radius.small, padding: Spacing.three, backgroundColor: isDefault ? Palette.softGreen : Palette.warmBeige }}><MaterialCommunityIcons name={isDefault ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={22} color={Palette.primaryDark} /><View style={{ flex: 1 }}><AppText variant="h3">ใช้เป็นที่อยู่หลัก</AppText><AppText variant="caption" tone="secondary">ระบบจะเลือกที่อยู่นี้ให้ตอนสั่งซื้อ</AppText></View></Pressable>
            <View style={{ gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.card, backgroundColor: Palette.softBlue }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }}><View style={{ flex: 1 }}><AppText variant="h3">ปักหมุดตำแหน่งจัดส่ง</AppText><AppText variant="caption" tone="secondary">แตะบนแผนที่หรือใช้ตำแหน่งปัจจุบัน เพื่อช่วยให้จัดส่งได้ถูกต้อง</AppText></View><Pressable accessibilityRole="button" onPress={() => { void requestCurrentLocation(); }} style={{ padding: Spacing.two }}><MaterialCommunityIcons name="crosshairs-gps" size={24} color={Palette.primaryDark} /></Pressable></View>
              {Platform.OS === 'web' ? <View style={{ minHeight: 100, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.small, backgroundColor: Palette.surface }}><AppText tone="secondary">การปักหมุดเปิดใช้ในแอปมือถือ</AppText></View> : mapsAvailable ? <MapView provider={PROVIDER_GOOGLE} style={{ height: 190, borderRadius: Radius.small }} region={region} onRegionChangeComplete={setRegion} onPress={(event) => applyCoordinate(event.nativeEvent.coordinate)}>{coordinate ? <Marker coordinate={coordinate} draggable onDragEnd={(event) => applyCoordinate(event.nativeEvent.coordinate)} title="ตำแหน่งจัดส่ง" /> : null}</MapView> : <View style={{ minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: Spacing.one, borderRadius: Radius.small, backgroundColor: Palette.surface, padding: Spacing.three }}><MaterialCommunityIcons name="map-marker-alert-outline" size={26} color={Palette.primaryDark} /><AppText tone="secondary" style={{ textAlign: 'center' }}>แผนที่จะเปิดใช้หลังตั้งค่า Google Maps และสร้างแอปใหม่</AppText></View>}
              <AppText variant="caption" tone={coordinate ? 'brand' : 'secondary'}>{coordinate ? 'บันทึกพิกัดแล้ว — ลากหมุดเพื่อปรับตำแหน่งได้' : mapsAvailable ? 'ยังไม่ได้ปักหมุด (ไม่บังคับ)' : 'ยังใช้ข้อมูลที่อยู่จัดส่งได้ตามปกติ'}</AppText>
            </View>
            <Pressable accessibilityRole="button" disabled={save.isPending} onPress={() => setShowForm(false)} style={{ alignSelf: 'center', padding: Spacing.two }}><AppText tone="secondary">ยกเลิก</AppText></Pressable>
          </View>}
        </>}
  </ScrollView>{showForm && userId ? <View style={{ paddingHorizontal: Spacing.five, paddingTop: Spacing.three, paddingBottom: Math.max(insets.bottom, Spacing.three), backgroundColor: Palette.surface, borderTopWidth: 1, borderColor: Palette.border }}><AppButton label={save.isPending ? 'กำลังบันทึก...' : 'บันทึกที่อยู่'} disabled={save.isPending} onPress={submit} /></View> : null}</View>;
}
