import { Image } from 'expo-image';
import { View } from 'react-native';

import { productImageSources } from './product-image-sources';

import { AppText } from '@/components/ui/app-text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import type { ProductCategoryId } from '@/features/products/domain/product';

const categoryStyles: Record<ProductCategoryId, { background: string; vessel: string; label: string }> = {
  cleanser: { background: Palette.softBlue, vessel: '#BFD9E2', label: 'CLEAN' },
  essence: { background: '#EDF3EC', vessel: '#C7DEC9', label: 'ESSENCE' },
  serum: { background: Palette.softPeach, vessel: '#E8B88F', label: 'SERUM' },
  moisturizer: { background: Palette.warmBeige, vessel: '#D9CEB8', label: 'CREAM' },
  sunscreen: { background: '#F7EBC8', vessel: '#E3C96F', label: 'SPF 50+' },
  treatment: { background: Palette.mutedRose, vessel: '#D7AAA5', label: 'ACTIVE' },
};

type ProductArtworkProps = Readonly<{
  categoryId: ProductCategoryId;
  productId?: string;
  compact?: boolean;
}>;

export function ProductArtwork({ categoryId, productId, compact = false }: ProductArtworkProps) {
  const palette = categoryStyles[categoryId];
  const imageSource = productId ? productImageSources[productId] : undefined;
  const vesselWidth = compact ? 54 : 84;
  const vesselHeight = compact ? 74 : 116;

  if (imageSource) {
    return (
      <View
        style={{
          height: compact ? 112 : 270,
          borderRadius: compact ? Radius.small : Radius.large,
          borderCurve: 'continuous',
          backgroundColor: Palette.surface,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
        <Image
          accessibilityLabel="ภาพผลิตภัณฑ์จริง"
          source={imageSource}
          contentFit="contain"
          transition={180}
          style={{ width: '84%', height: compact ? 106 : 248 }}
        />
      </View>
    );
  }

  return (
    <View
      accessibilityLabel={`ภาพจำลองผลิตภัณฑ์ ${palette.label}`}
      style={{
        height: compact ? 112 : 270,
        borderRadius: compact ? Radius.small : Radius.large,
        borderCurve: 'continuous',
        backgroundColor: palette.background,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
      <View
        style={{
          width: vesselWidth * 0.48,
          height: compact ? 14 : 20,
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
          backgroundColor: Palette.primaryDark,
        }}
      />
      <View
        style={{
          width: vesselWidth,
          height: vesselHeight,
          borderRadius: compact ? 12 : 18,
          borderCurve: 'continuous',
          backgroundColor: palette.vessel,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: Spacing.one,
        }}>
        <View
          style={{
            width: '78%',
            minHeight: compact ? 26 : 38,
            borderRadius: 6,
            backgroundColor: 'rgba(255,255,255,0.72)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <AppText
            tone="brand"
            style={{ fontSize: compact ? 8 : 10, lineHeight: compact ? 10 : 13, fontWeight: '700' }}>
            {palette.label}
          </AppText>
        </View>
      </View>
    </View>
  );
}
