import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { FeedbackState } from '@/components/ui/feedback-state';
import { MaxContentWidth, Palette, Spacing } from '@/constants/theme';
import { getProtectedAuthRoute } from '@/features/auth/application/auth-session';
import { useAuthSession } from '@/features/auth/ui/auth-session-provider';
import { favoriteProductIdsQuery } from '@/features/favorites/application/favorite-queries';
import { productSummariesByIdsQuery } from '@/features/products/application/product-queries';
import { ProductCard } from '@/features/products/ui/product-card';

export default function FavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoading: isLoadingSession, session } = useAuthSession();
  const userId = session?.user.id;
  const favoriteIds = useQuery({
    ...favoriteProductIdsQuery(userId ?? ''),
    enabled: Boolean(userId),
  });
  const products = useQuery({
    ...productSummariesByIdsQuery(favoriteIds.data ?? []),
    enabled: favoriteIds.isSuccess && (favoriteIds.data?.length ?? 0) > 0,
  });

  useFocusEffect(useCallback(() => {
    if (!isLoadingSession && !userId) router.replace(getProtectedAuthRoute('/favorites', false) as never);
  }, [isLoadingSession, router, userId]));

  const retry = () => {
    void favoriteIds.refetch();
    void products.refetch();
  };

  if (isLoadingSession || !userId) return <View style={styles.page} />;

  const savedIds = favoriteIds.data ?? [];
  const isLoading = favoriteIds.isPending || (savedIds.length > 0 && products.isPending);
  const isError = favoriteIds.isError || products.isError;

  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.one }]}>
        <Pressable
          accessibilityLabel="ย้อนกลับ"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/profile')}
          style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={25} color={Palette.textPrimary} />
        </Pressable>
        <AppText variant="h1" tone="brand" style={styles.title}>รายการโปรด</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={products.data ?? []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: Spacing.three }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <View style={styles.productCell}>
            <ProductCard product={item} width="100%" />
          </View>
        )}
        ListHeaderComponent={
          <AppText tone="secondary" style={styles.summary}>
            {isLoading ? 'กำลังโหลดรายการที่บันทึก' : `บันทึกไว้ ${savedIds.length} รายการ`}
          </AppText>
        }
        ListEmptyComponent={
          isLoading ? (
            <FeedbackState title="กำลังโหลดรายการโปรด" message="อีกสักครู่รายการที่บันทึกจะพร้อม" />
          ) : isError ? (
            <FeedbackState title="โหลดรายการโปรดไม่สำเร็จ" message="กรุณาลองใหม่อีกครั้ง" actionLabel="ลองใหม่" onAction={retry} />
          ) : (
            <FeedbackState title="ยังไม่มีรายการโปรด" message="แตะรูปหัวใจบนสินค้าเพื่อบันทึกไว้ดูภายหลัง" />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Palette.background },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    minHeight: 58,
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { width: 36, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center' },
  headerSpacer: { width: 36 },
  content: {
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.nine,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  summary: { marginBottom: Spacing.three, fontSize: 12, lineHeight: 18 },
  productCell: { flex: 1, marginBottom: Spacing.three },
});
