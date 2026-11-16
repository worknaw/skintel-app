import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductCard } from './product-card';
import { productImageSources } from './product-image-sources';
import { screenContentStyle } from './screen-shell';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Chip } from '@/components/ui/chip';
import { FeedbackState } from '@/components/ui/feedback-state';
import { SearchField } from '@/components/ui/search-field';
import { SectionHeader } from '@/components/ui/section-header';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';
import { productListQuery } from '@/features/products/application/product-queries';
import { getProtectedAuthRoute } from '@/features/auth/application/auth-session';
import { useAuthSession } from '@/features/auth/ui/auth-session-provider';
import type { ProductCategoryId } from '@/features/products/domain/product';
import { FloatingChatButton, useFloatingChatDocking } from '@/features/skin-chat/ui/floating-chat-button';
import { SkinChatModal } from '@/features/skin-chat/ui/skin-chat-modal';
import { skinProfileQuery } from '@/features/skin-profile/application/skin-profile-queries';

const quickTopics: readonly { label: string; categoryId?: ProductCategoryId }[] = [
  { label: 'ทั้งหมด' },
  { label: 'คลีนเซอร์', categoryId: 'cleanser' },
  { label: 'เซรั่ม', categoryId: 'serum' },
  { label: 'มอยส์เจอไรเซอร์', categoryId: 'moisturizer' },
  { label: 'กันแดด', categoryId: 'sunscreen' },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuthSession();
  const products = useQuery(productListQuery({ limit: 6, sort: 'popular' }));
  const skinProfile = useQuery({ ...skinProfileQuery(session?.user.id ?? ''), enabled: Boolean(session) });
  const [chatVisible, setChatVisible] = useState(false);
  const { translateX, opacity, scrollHandlers } = useFloatingChatDocking();
  const recommendedRoles = skinProfile.data?.skinType === 'oily' ? ['cleanser', 'treatment'] : skinProfile.data?.skinType === 'dry' ? ['hydrator', 'moisturizer'] : ['moisturizer', 'sunscreen'];
  const recommendedProducts = (products.data?.items ?? []).filter((product) => product.routineRoles.some((role) => recommendedRoles.includes(role))).slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: Palette.background }}>
      <ScrollView
        {...scrollHandlers}
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: Palette.background }}
        contentContainerStyle={{ paddingBottom: Spacing.nine }}
        showsVerticalScrollIndicator={false}>
      <View style={{ paddingTop: insets.top + Spacing.two, paddingHorizontal: Spacing.five, paddingBottom: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="h1" tone="brand" style={{ fontFamily: Fonts.serif, fontWeight: '400', letterSpacing: -0.5 }}>SkinCycle</AppText>
      </View>
      <View style={screenContentStyle}>
        <AppText variant="caption" tone="secondary">เลือกสกินแคร์ให้เข้ากับผิว และสั่งซื้อได้จาก SkinCycle</AppText>
        <View style={{ gap: Spacing.three }}>
          <Link href="/discover" asChild>
            <Pressable accessibilityRole="button" accessibilityLabel="เปิดหน้าค้นหา">
              <View pointerEvents="none">
                <SearchField editable={false} />
              </View>
            </Pressable>
          </Link>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
            {quickTopics.map((topic, index) => (
              <Chip key={topic.label} label={topic.label} selected={index === 0} onPress={() => router.navigate({ pathname: '/discover', params: { categoryId: topic.categoryId ?? '', search: '', filterRequest: String(Date.now()) } })} />
            ))}
          </ScrollView>
        </View>

        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          {[
            ['scan-helper', 'สแกนผิว', '/analysis'],
            ['calendar-check-outline', 'รูทีนวันนี้', '/routine'],
            ['heart-outline', 'รายการโปรด', '/favorites'],
            ['map-marker-outline', 'ที่อยู่จัดส่ง', '/addresses'],
          ].map(([icon, label, route]) => <Pressable key={label} accessibilityRole="button" onPress={() => router.push(route as never)} style={{ flex: 1, alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.two, borderRadius: Radius.input, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border }}><MaterialCommunityIcons name={icon as never} size={21} color={Palette.primaryDark} /><AppText variant="caption" numberOfLines={1}>{label}</AppText></Pressable>)}
        </View>

        <LinearGradient
          colors={['#F9FFFB', '#E3F7EA', '#A9DEBC']}
          locations={[0, 0.52, 1]}
          start={{ x: 0.04, y: 0.05 }}
          end={{ x: 1, y: 0.92 }}
          style={{
            minHeight: 174,
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: Radius.card,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: '#CFE3D6',
            paddingLeft: Spacing.five,
            paddingRight: Spacing.two,
            gap: Spacing.two,
            overflow: 'hidden',
          }}>
          <View style={{ position: 'absolute', width: 110, height: 110, borderRadius: 55, top: -35, right: 68, backgroundColor: 'rgba(255,255,255,0.42)' }} />
          <View style={{ position: 'absolute', width: 9, height: 9, borderRadius: 5, top: 22, left: 182, backgroundColor: 'rgba(255,255,255,0.9)' }} />
          <View style={{ position: 'absolute', width: 5, height: 5, borderRadius: 3, top: 45, left: 200, backgroundColor: 'rgba(255,255,255,0.8)' }} />
          <View style={{ flex: 1, gap: Spacing.two, zIndex: 2 }}>
            <AppText variant="h2" tone="brand">เข้าใจผิวตัวเอง{`\n`}เลือกสกินแคร์ที่ใช่</AppText>
            <AppText variant="caption" tone="secondary">ระบบสแกนผิวอยู่ระหว่างการทดลอง</AppText>
            <AppButton
              label="วิเคราะห์ผิว"
              icon={<MaterialCommunityIcons name="shimmer" size={18} color={Palette.white} />}
              onPress={() => router.push(getProtectedAuthRoute('/analysis', Boolean(session)) as never)}
            />
          </View>
          <View style={{ width: 138, height: 166, justifyContent: 'flex-end' }}>
            <Image source={productImageSources['anua-heartleaf-toner']} contentFit="contain" style={{ position: 'absolute', width: 72, height: 142, right: 53, bottom: 0, transform: [{ rotate: '-4deg' }] }} />
            <Image source={productImageSources['the-ordinary-niacinamide']} contentFit="contain" style={{ position: 'absolute', width: 68, height: 120, right: 7, bottom: -2 }} />
            <MaterialCommunityIcons name="shimmer" size={19} color="rgba(255,255,255,0.96)" style={{ position: 'absolute', top: 18, right: 10 }} />
          </View>
        </LinearGradient>

        <View style={{ gap: Spacing.one }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
              <MaterialCommunityIcons name="fire" size={17} color="#F07836" />
              <AppText style={{ fontFamily: 'NotoSansThai_600SemiBold', fontSize: 14, lineHeight: 20 }}>ยอดนิยมวันนี้</AppText>
            </View>
            <Link href="/discover" asChild><Pressable hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}><AppText tone="brand" style={{ fontSize: 11, lineHeight: 16 }}>ดูทั้งหมด</AppText><MaterialCommunityIcons name="chevron-right" size={16} color={Palette.primaryDark} /></Pressable></Link>
          </View>
          {products.isError ? (
            <FeedbackState title="โหลดสินค้าไม่สำเร็จ" message="ลองเชื่อมต่ออีกครั้ง" actionLabel="ลองใหม่" onAction={() => products.refetch()} />
          ) : (
            <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'stretch' }}>
              {(products.data?.items ?? []).slice(0, 3).map((product) => (
                <ProductCard key={product.id} product={product} fill />
              ))}
            </View>
          )}
        </View>

        {skinProfile.data && recommendedProducts.length > 0 ? <View style={{ gap: Spacing.one }}>
          <SectionHeader title="แนะนำสำหรับโปรไฟล์ผิวของคุณ" subtitle="คัดจากข้อมูลที่คุณกรอกไว้" />
          <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'stretch' }}>{recommendedProducts.map((product) => <ProductCard key={product.id} product={product} fill />)}</View>
        </View> : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ค้นหาสกินแคร์ตามงบประมาณ"
          onPress={() => router.navigate('/discover')}
          style={({ pressed }) => ({
            borderRadius: Radius.card,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: '#F4E2D4',
            overflow: 'hidden',
            opacity: pressed ? 0.84 : 1,
          })}>
          <LinearGradient colors={['#FFFDFB', '#FFF4EA', '#FDE9D8']} locations={[0, 0.56, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ minHeight: 76, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, gap: Spacing.three, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="wallet" size={39} color="#EDA05A" />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <AppText style={{ fontFamily: 'NotoSansThai_600SemiBold', fontSize: 14, lineHeight: 20 }}>สำรวจผลิตภัณฑ์</AppText>
              <AppText tone="secondary" numberOfLines={1} style={{ fontSize: 10, lineHeight: 15 }}>ดูรายการสกินแคร์ที่คัดสรรโดย SkinCycle</AppText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={Palette.textPrimary} />
          </LinearGradient>
        </Pressable>

      </View>
    </ScrollView>

    <FloatingChatButton
      translateX={translateX}
      opacity={opacity}
      onPress={() => setChatVisible(true)}
    />

    <SkinChatModal
      visible={chatVisible}
      onClose={() => setChatVisible(false)}
    />
  </View>
);
}
