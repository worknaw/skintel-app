import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, View, type DimensionValue } from 'react-native';

import { ProductArtwork } from './product-artwork';

import { AppText } from '@/components/ui/app-text';
import { useAppNotification } from '@/components/ui/app-notification';
import { Palette, Radius } from '@/constants/theme';
import { formatMoney } from '@/features/products/application/format-money';
import { productDetailQuery } from '@/features/products/application/product-queries';
import type { ProductSummary } from '@/features/products/domain/product';
import { getProtectedAuthRoute } from '@/features/auth/application/auth-session';
import { useProductFavorite } from '@/features/favorites/application/use-product-favorite';

type ProductCardProps = Readonly<{
  product: ProductSummary;
  width?: DimensionValue;
  fill?: boolean;
}>;

export function ProductCard({ product, width = 116, fill = false }: ProductCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const displayName = `${product.brandName} ${product.name}`;
  const { isFavorite, isUpdating, toggleFavorite } = useProductFavorite(product.id);
  const { showNotification } = useAppNotification();

  const handleFavoritePress = () => {
    if (isUpdating) return;
    void toggleFavorite().then((result) => {
      if (result === 'authentication-required') {
        router.push(getProtectedAuthRoute(`/product/${product.id}`, false) as never);
      }
    }).catch(() => {
      showNotification({ title: 'บันทึกรายการโปรดไม่สำเร็จ', message: 'กรุณาลองใหม่อีกครั้ง', variant: 'error' });
    });
  };

  return (
    <View style={{ width: fill ? undefined : width, flex: fill ? 1 : undefined, minWidth: 0, position: 'relative' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`ดูรายละเอียด ${product.brandName} ${product.name}`}
        onPressIn={() => { void queryClient.prefetchQuery(productDetailQuery(product.id)); }}
        onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
        style={({ pressed }) => ({
          borderRadius: Radius.small,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: Palette.border,
          backgroundColor: Palette.surface,
          padding: 4,
          opacity: pressed ? 0.82 : 1,
          gap: 3,
        })}>
        <View>
          <ProductArtwork productId={product.id} categoryId={product.categoryId} compact />
        </View>
        <View style={{ gap: 2, paddingHorizontal: 1, paddingBottom: 1 }}>
          <AppText numberOfLines={3} style={{ minHeight: 38, fontFamily: 'NotoSansThai_600SemiBold', fontSize: 9.5, lineHeight: 12.5 }}>
            {displayName}
          </AppText>
          <AppText tone="secondary" numberOfLines={1} style={{ fontSize: 9, lineHeight: 13 }}>
            {product.brandName}
          </AppText>
          <View style={{ alignSelf: 'flex-start', minHeight: 20, borderRadius: Radius.round, backgroundColor: '#E7F3E9', paddingHorizontal: 7, justifyContent: 'center' }}>
            <AppText tone="brand" numberOfLines={1} style={{ fontSize: 8.5, lineHeight: 12 }}>{product.tags[0]}</AppText>
          </View>
          <AppText selectable style={{ fontFamily: 'NotoSansThai_700Bold', fontSize: 16, lineHeight: 21, fontVariant: ['tabular-nums'] }}>
            {product.startingPrice ? formatMoney(product.startingPrice) : 'ยังไม่มีราคา'}
          </AppText>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isFavorite ? `นำ ${displayName} ออกจากรายการโปรด` : `เพิ่ม ${displayName} เป็นรายการโปรด`}
        hitSlop={6}
        onPress={handleFavoritePress}
        style={{ position: 'absolute', top: 5, right: 4, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name={isFavorite ? 'heart' : 'heart-outline'} size={19} color="#818581" />
      </Pressable>
    </View>
  );
}
