import { Link } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { screenContentStyle, ScreenHeader } from '@/features/products/ui/screen-shell';

export default function AnalysisScreen() {
  return <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: Palette.background }}>
    <ScreenHeader title="ผลวิเคราะห์ผิว" />
    <View style={screenContentStyle}>
      <View style={{ padding: Spacing.five, gap: Spacing.three, borderRadius: Radius.large, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border }}>
        <AppText variant="h2" tone="brand">ยังไม่มีผลวิเคราะห์ที่ยืนยันได้</AppText>
        <AppText tone="secondary">ระบบถ่ายภาพและแบบสอบถามอยู่ระหว่างพัฒนา จึงยังไม่แสดงคะแนนหรือสรุปสภาพผิวในหน้านี้</AppText>
        <AppText variant="caption" tone="secondary">เมื่อเปิดใช้งาน ผลจะเป็นการประเมินเบื้องต้น ไม่ใช่การวินิจฉัยทางการแพทย์</AppText>
        <Link href="/analysis" asChild><AppButton label="ไปหน้าสแกนผิว" /></Link>
      </View>
    </View>
  </ScrollView>;
}
