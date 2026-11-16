import { Link } from 'expo-router';
import { Pressable, ScrollView } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { FeedbackState } from '@/components/ui/feedback-state';
import { Palette, Spacing } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: Palette.background }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: Spacing.five }}>
      <FeedbackState title="ไม่พบหน้าที่ต้องการ" message="ลิงก์นี้อาจถูกย้ายหรือไม่มีอยู่แล้ว" />
      <Link href="/" asChild>
        <Pressable style={{ alignSelf: 'center', padding: Spacing.five }}>
          <AppText variant="button" tone="brand">
            กลับหน้าหลัก
          </AppText>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
