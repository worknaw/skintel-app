import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { useAppNotification } from '@/components/ui/app-notification';
import { FeedbackState } from '@/components/ui/feedback-state';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/features/auth/ui/auth-session-provider';
import { runGeminiScan, type GeminiScanResult } from '@/features/skin-analysis/services/gemini-scan';
import { deleteScan, loadScanHistory, type ScanHistoryItem } from '@/features/skin-analysis/services/scan-history';

type Stage = 'prepare' | 'camera' | 'review' | 'processing' | 'result' | 'history';

function validatePhoto(uri: string, width: number, height: number) {
  if (width < 320 || height < 320) throw new Error('ภาพเล็กเกินไป กรุณาเลือกภาพใหม่');
  return { uri, width, height };
}

function compactFinding(value: string): string {
  const text = value.replace(/\s*\(จากข้อมูล onboarding\)\s*/g, '').trim();
  if (!text || /ยังประเมินไม่ได้|ยังไม่มี|ไม่สามารถประเมิน|ไม่ชัด/.test(text)) return 'ยังประเมินไม่ได้';
  if (/ไม่พบ|ไม่มีลักษณะ|ไม่เห็น/.test(text)) return 'ไม่พบชัดเจน';
  if (/พบ|มีลักษณะ|อาจเกี่ยวข้อง|อาจเป็น/.test(text)) return 'พบลักษณะที่ควรดูแล';
  return text.length > 64 ? `${text.slice(0, 61)}...` : text;
}

function findingStars(value: string): { filled: number; label: string } {
  if (/ประเมินไม่ได้|ยังไม่มี|ไม่ชัด/.test(value)) return { filled: 0, label: 'ยังประเมินไม่ได้' };
  if (/ไม่พบ|ไม่มีลักษณะ|ไม่เห็น/.test(value)) return { filled: 0, label: 'ไม่พบชัดเจน' };
  if (/พบชัดเจน/.test(value)) return { filled: 5, label: 'ชัดเจน' };
  if (/พบปานกลาง/.test(value)) return { filled: 3, label: 'ปานกลาง' };
  return { filled: 1, label: 'เล็กน้อย' };
}

function FindingLevel({ label, value }: Readonly<{ label: string; value: string }>) {
  const level = findingStars(value);
  return <View style={styles.findingRow}>
    <AppText>{label}</AppText>
    <View style={styles.levelGroup}>
      <AppText style={styles.stars}>{Array.from({ length: 5 }, (_, index) => index < level.filled ? '★' : '☆').join('')}</AppText>
      <AppText variant="caption" tone="secondary" style={styles.levelLabel}>{level.label}</AppText>
    </View>
  </View>;
}

export default function ScanFlowScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<Stage>('prepare');
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [result, setResult] = useState<GeminiScanResult | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const { session } = useAuthSession();
  const { showNotification } = useAppNotification();
  const reset = useCallback(() => {
    setStage('prepare');
    setPhoto(null);
    setResult(null);
  }, []);

  // Reset to prepare stage when navigating away
  useFocusEffect(useCallback(() => {
    return () => {
      reset();
    };
  }, [reset]));

  const openCamera = async () => {
    const allowed = permission?.granted || (await requestPermission()).granted;
    if (!allowed) {
      showNotification({ title: 'ต้องอนุญาตกล้อง', message: 'เปิดสิทธิ์กล้องในการตั้งค่าเครื่อง หรือเลือกภาพจากคลังแทน', variant: 'warning' });
      return;
    }
    setCameraReady(false);
    setStage('camera');
  };

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, exif: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) throw new Error('อ่านภาพไม่ได้ กรุณาเลือกภาพใหม่');
      setPhoto(validatePhoto(asset.uri, asset.width, asset.height));
      setStage('review');
    } catch (error) {
      showNotification({ title: 'เลือกภาพไม่สำเร็จ', message: error instanceof Error ? error.message : 'กรุณาลองใหม่', variant: 'error' });
    }
  };

  const capture = async () => {
    if (!cameraReady || busy || !camera.current) return;
    setBusy(true);
    try {
      const image = await camera.current.takePictureAsync({ quality: 0.85, exif: false, mirror: false });
      if (!image?.uri) throw new Error('ภาพไม่สมบูรณ์ กรุณาถ่ายใหม่');
      setPhoto(validatePhoto(image.uri, image.width, image.height));
      setStage('review');
    } catch (error) {
      showNotification({ title: 'ถ่ายภาพไม่สำเร็จ', message: error instanceof Error ? error.message : 'กรุณาลองใหม่', variant: 'error' });
    } finally { setBusy(false); }
  };

  const step = stage === 'prepare' ? 0 : stage === 'camera' ? 1 : 2;
  const openHistory = async () => {
    if (!session) { showNotification({ title: 'กรุณาเข้าสู่ระบบ', variant: 'warning' }); return; }
    setHistoryBusy(true);
    try { setHistory(await loadScanHistory()); setStage('history'); }
    catch (error) { showNotification({ title: 'โหลดประวัติไม่สำเร็จ', message: error instanceof Error ? error.message : 'กรุณาลองใหม่', variant: 'error' }); }
    finally { setHistoryBusy(false); }
  };
  const confirmDelete = (id: string) => showNotification({ title: 'ลบผลสแกนนี้?', message: 'ผลวิเคราะห์และความยินยอมของการสแกนครั้งนี้จะถูกลบ', variant: 'warning', actions: [
    { label: 'ยกเลิก', style: 'cancel' },
    { label: 'ลบ', onPress: () => { void (async () => {
      try { await deleteScan(id); setHistory((items) => items.filter((item) => item.id !== id)); }
      catch (error) { showNotification({ title: 'ลบไม่สำเร็จ', message: error instanceof Error ? error.message : 'กรุณาลองใหม่', variant: 'error' }); }
    })(); } },
  ] });
  const analyze = async () => {
    if (!photo) return;
    if (!session) {
      showNotification({ title: 'กรุณาเข้าสู่ระบบ', message: 'เข้าสู่ระบบก่อนบันทึกผลสแกน', variant: 'warning' }); return;
    }
    const message = 'SkinCycle จะส่งภาพใบหน้าและข้อมูลสภาพผิวจาก onboarding ไปยังระบบวิเคราะห์ เพื่อรับคำแนะนำเบื้องต้น ไม่เก็บภาพในฐานข้อมูล และเก็บเฉพาะผลไว้ในประวัติ คุณสามารถยกเลิกได้';
    showNotification({ title: 'ยินยอมส่งภาพไปวิเคราะห์?', message, variant: 'info', actions: [
      { label: 'ยกเลิก', style: 'cancel' },
      { label: 'ยินยอม', onPress: () => { void (async () => {
        setStage('processing');
        try {
          const scanResult = await runGeminiScan(photo.uri);
          setResult(scanResult);
          // Routine is kept mounted as a tab, so invalidate its cached plan
          // before the user taps through from this result screen.
          await queryClient.invalidateQueries({ queryKey: ['active-skin-cycling-plan', session?.user.id] });
          setStage('result');
        } catch (error) {
          setStage('review');
          showNotification({ title: 'วิเคราะห์ไม่สำเร็จ', message: error instanceof Error ? error.message : 'กรุณาลองใหม่', variant: 'error' });
        }
      })(); } },
    ] });
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.two, paddingBottom: insets.bottom + 92 }]}
      showsVerticalScrollIndicator={false}>
      <AppText variant="h1" tone="brand" style={styles.center}>สแกนผิวหน้า</AppText>

      {Platform.OS !== 'android' ? (
        <FeedbackState title="สแกนผิวยังไม่เปิดใช้งาน" message="ระบบอยู่ระหว่างการทดสอบความแม่นยำ" />
      ) : (
        <>
          {/* Step indicator */}
          <View style={styles.steps}>
            {(['เตรียมพร้อม', 'ถ่ายภาพ', 'ตรวจภาพ'] as const).map((label, index) => (
              <View key={label} style={styles.step}>
                <View style={[styles.stepNumber, step === index && styles.activeStep]}>
                  <AppText variant="caption" tone={step === index ? 'inverse' : 'secondary'}>{index + 1}</AppText>
                </View>
                <AppText variant="caption" tone={step === index ? 'brand' : 'secondary'}>{label}</AppText>
              </View>
            ))}
          </View>

          {/* Stage: Prepare */}
          {stage === 'prepare' && (
            <>
              <View style={styles.card}>
                <AppText variant="h3" tone="brand">ถ่ายให้เห็นผิวชัดเจน</AppText>
                <AppText tone="secondary">ถ่ายหน้าตรงให้ใบหน้าอยู่เต็มกรอบ ใช้แสงสม่ำเสมอ หลีกเลี่ยงแสงย้อน เครื่องสำอาง และฟิลเตอร์ปรับผิว เช็ดเลนส์และถือกล้องให้นิ่ง</AppText>
                <AppText variant="caption" tone="secondary">เมื่อติดตามผล ควรใช้กล้อง ระยะ และแสงใกล้เคียงเดิมทุกครั้ง</AppText>
              </View>
              <AppButton
                label="เปิดกล้องหน้า"
                onPress={() => { void openCamera(); }}
              />
              <AppButton label="เลือกภาพจากคลัง" variant="secondary" onPress={() => { void pickPhoto(); }} />
              <AppButton label={historyBusy ? 'กำลังโหลดประวัติ...' : 'ดูประวัติสแกน'} variant="ghost" disabled={historyBusy} onPress={() => { void openHistory(); }} />
            </>
          )}

          {stage === 'camera' && (
            <>
              <View style={styles.frame} collapsable={false}>
                <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="front" mode="picture" onCameraReady={() => setCameraReady(true)} onMountError={() => showNotification({ title: 'เปิดกล้องไม่สำเร็จ', message: 'ลองใหม่หรือเลือกภาพจากคลัง', variant: 'error' })} />
                <View style={styles.frameOverlay} pointerEvents="none">
                  <View style={styles.faceOval} />
                </View>
              </View>
              <AppButton
                label={busy ? 'กำลังถ่ายภาพ...' : cameraReady ? 'ถ่ายภาพ' : 'กำลังเปิดกล้อง...'}
                disabled={busy || !cameraReady}
                onPress={() => { void capture(); }}
              />
              <AppButton label="ยกเลิก" variant="ghost" onPress={reset} />
            </>
          )}

          {stage === 'review' && photo && (
            <>
              <View style={styles.card}>
                <AppText variant="h3" tone="brand">ตรวจภาพก่อนดำเนินการ</AppText>
                <Image source={{ uri: photo.uri }} style={styles.reviewImage} resizeMode="contain" />
                <AppText tone="secondary">ตรวจว่าเห็นใบหน้าชัด แสงสม่ำเสมอ และไม่มีฟิลเตอร์ปรับผิวก่อนส่งให้ AI วิเคราะห์</AppText>
              </View>
              <AppButton label="วิเคราะห์ภาพด้วย AI" onPress={() => { void analyze(); }} />
              <AppButton label="ถ่ายใหม่" variant="secondary" onPress={() => { setPhoto(null); void openCamera(); }} />
              <AppButton label="เลือกภาพอื่น" variant="ghost" onPress={() => { void pickPhoto(); }} />
            </>
          )}
          {stage === 'processing' && <FeedbackState title="กำลังวิเคราะห์ภาพ" message="ระบบกำลังตรวจดูรายละเอียดผิวของคุณ" loading />}
          {stage === 'result' && result && <View style={styles.card}>
            <AppText variant="h3" tone="brand">ผลประเมินเบื้องต้น</AppText>
            {photo && <View style={styles.resultImageWrap}><Image source={{ uri: photo.uri }} style={styles.reviewImage} resizeMode="contain" /></View>}
            <>
              <AppText variant="h3" tone="brand">สรุปผิวของคุณ</AppText>
              <FindingLevel label="สิว" value={result.visible_acne} />
              <FindingLevel label="รอยแดง" value={result.visible_redness} />
              <FindingLevel label="รอยดำ/รอยสิว" value={result.visible_marks} />
              <View style={styles.findingRow}><AppText>แนวโน้มผิว</AppText><AppText tone="secondary">{result.skin_tendency}</AppText></View>
              <View style={styles.recommendationBox}>
                <AppText variant="h3" tone="brand">สิ่งที่ควรดูแล</AppText>
                {result.morning.slice(0, 3).map((item, index) => <AppText key={`care-${index}`} tone="secondary">• {item}</AppText>)}
              </View>
              <AppText tone="secondary" style={styles.disclaimer}>{result.limitation}</AppText>
              <AppButton label="ไปที่ Skin Cycling" onPress={() => router.push('/routine')} />
              <AppButton label="สแกนใหม่" variant="secondary" onPress={reset} />
              <AppButton label="ดูประวัติสแกน" variant="ghost" onPress={() => { void openHistory(); }} />
            </>
          </View>}
          {stage === 'history' && <>
            <View style={styles.card}>
              <AppText variant="h3" tone="brand">ประวัติสแกน</AppText>
              <AppText variant="caption" tone="secondary">บันทึกเฉพาะผลวิเคราะห์ ภาพใบหน้าไม่ได้ถูกเก็บ จึงยังเปรียบเทียบภาพก่อนและหลังไม่ได้</AppText>
            </View>
            {history.length === 0 && <FeedbackState title="ยังไม่มีผลสแกน" message="สแกนครั้งแรกเพื่อดูผลที่นี่" />}
            {history.map((item) => <View key={item.id} style={styles.card}>
              <AppText variant="h3" tone="brand">{new Date(item.createdAt).toLocaleString('th-TH')}</AppText>
              <AppText variant="caption" tone="secondary">ผลสแกนผิว</AppText>
              <AppText>ลักษณะคล้ายสิว: {item.result.visible_acne}</AppText>
              <AppText>รอยแดง: {item.result.visible_redness}</AppText>
              <AppText>รอยสิว/รอยดำ: {item.result.visible_marks}</AppText>
              <AppText>แนวโน้มผิว: {compactFinding(item.result.skin_tendency)}</AppText>
              <AppText tone="secondary">ข้อจำกัด: {item.result.limitation}</AppText>
              <AppText variant="h3" tone="brand">ตอนเช้า</AppText>
              {item.result.morning.map((text, index) => <AppText key={`m-${index}`}>• {text}</AppText>)}
              <AppText variant="h3" tone="brand">ตอนกลางคืน</AppText>
              {item.result.evening.map((text, index) => <AppText key={`e-${index}`}>• {text}</AppText>)}
              <AppButton label="ลบผลสแกน" variant="ghost" onPress={() => confirmDelete(item.id)} />
            </View>)}
            <AppButton label="กลับไปสแกน" variant="secondary" onPress={reset} />
          </>}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Palette.background },
  content: { paddingHorizontal: 10, gap: Spacing.three },
  center: { textAlign: 'center' },
  steps: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two, borderRadius: 27, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Spacing.three },
  step: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, flexShrink: 1 },
  stepNumber: { width: 23, height: 23, borderRadius: 12, borderColor: Palette.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  activeStep: { backgroundColor: Palette.accent, borderColor: Palette.accent },
  card: { padding: Spacing.four, gap: Spacing.two, borderRadius: Radius.card, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface },
  findingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  levelGroup: { flexDirection: 'row', alignItems: 'center', width: 184, gap: 4 },
  stars: { width: 94, color: '#D89A32', fontSize: 16, letterSpacing: 1 },
  levelLabel: { width: 82 },
  recommendationBox: { gap: Spacing.one, marginTop: Spacing.one, padding: Spacing.three, borderRadius: Radius.card, backgroundColor: Palette.softGreen },
  disclaimer: { fontSize: 11, lineHeight: 17 },
  frame: { height: 440, borderRadius: Radius.large, overflow: 'hidden', backgroundColor: Palette.warmBeige },
  resultImageWrap: { width: '100%', height: 340, borderRadius: Radius.small, overflow: 'hidden', backgroundColor: Palette.warmBeige },
  reviewImage: { width: '100%', height: 340, borderRadius: Radius.small, backgroundColor: Palette.warmBeige },
  frameOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  faceOval: { width: '58%', height: '65%', borderRadius: 160, borderWidth: 2, borderStyle: 'dashed', borderColor: Palette.white },
});
