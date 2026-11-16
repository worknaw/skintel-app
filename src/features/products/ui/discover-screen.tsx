import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';

import { ProductCard } from './product-card';
import { ScreenHeader } from './screen-shell';

import { AppText } from '@/components/ui/app-text';
import { Chip } from '@/components/ui/chip';
import { FeedbackState } from '@/components/ui/feedback-state';
import { SearchField } from '@/components/ui/search-field';
import { MaxContentWidth, Palette, Spacing } from '@/constants/theme';
import { productListQuery } from '@/features/products/application/product-queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { ProductCategoryId, ProductSort } from '@/features/products/domain/product';

const categories: readonly { id: ProductCategoryId | undefined; label: string }[] = [
  { id: undefined, label: 'ทั้งหมด' },
  { id: 'cleanser', label: 'คลีนเซอร์' },
  { id: 'serum', label: 'เซรั่ม' },
  { id: 'moisturizer', label: 'มอยส์เจอไรเซอร์' },
  { id: 'sunscreen', label: 'กันแดด' },
  { id: 'treatment', label: 'ทรีตเมนต์' },
];

const sorts: readonly { id: ProductSort; label: string }[] = [
  { id: 'popular', label: 'ยอดนิยม' },
  { id: 'price-asc', label: 'ราคาต่ำก่อน' },
  { id: 'price-desc', label: 'ราคาสูงก่อน' },
];

export default function DiscoverScreen() {
  const params = useLocalSearchParams<{ search?: string; categoryId?: ProductCategoryId; filterRequest?: string }>();
  const initialSearch = typeof params.search === 'string' ? params.search : '';
  const initialCategoryId = categories.some((category) => category.id === params.categoryId) ? params.categoryId : undefined;
  const [search, setSearch] = useState(initialSearch);
  const [categoryId, setCategoryId] = useState<ProductCategoryId | undefined>(initialCategoryId);
  const [sort, setSort] = useState<ProductSort>('popular');
  const intent = JSON.stringify([initialSearch, initialCategoryId, params.filterRequest]);
  const appliedIntent = useRef(intent);
  useFocusEffect(useCallback(() => {
    if (appliedIntent.current === intent) return;
    appliedIntent.current = intent;
    setSearch(initialSearch);
    setCategoryId(initialCategoryId);
  }, [intent, initialSearch, initialCategoryId]));
  const settledSearch = useDebouncedValue(search.trim());
  const query = useMemo(() => ({ search: settledSearch, categoryId, sort, limit: 30 }), [settledSearch, categoryId, sort]);
  const products = useQuery(productListQuery(query));

  const header = (
    <View style={{ gap: Spacing.four, marginBottom: Spacing.five }}>
      <AppText variant="caption" tone="secondary">เลือกสกินแคร์ที่จำหน่ายใน SkinCycle</AppText>
      <SearchField value={search} onChangeText={setSearch} />
      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item.label}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: Spacing.two }}
        renderItem={({ item }) => <Chip label={item.label} selected={categoryId === item.id} onPress={() => setCategoryId(item.id)} />}
      />
      <View style={{ gap: Spacing.two }}>
        <AppText variant="caption" tone="secondary">เรียงตาม</AppText>
        <FlatList
          horizontal
          data={sorts}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.two }}
          renderItem={({ item }) => <Chip label={item.label} selected={sort === item.id} onPress={() => setSort(item.id)} />}
        />
      </View>
      <AppText variant="h3">พบ {products.data?.total ?? 0} รายการ</AppText>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Palette.background }}>
      <ScreenHeader eyebrow="ค้นหาตามสิ่งที่ผิวต้องการ" title="Discover" />
      <FlatList
        data={products.data?.items ?? []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: Spacing.three }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.five,
          paddingBottom: Spacing.nine,
          maxWidth: MaxContentWidth,
          width: '100%',
          alignSelf: 'center',
        }}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View style={{ flex: 1, marginBottom: Spacing.three }}>
            <ProductCard product={item} width="100%" />
          </View>
        )}
        ListEmptyComponent={
          products.isPending ? (
            <FeedbackState title="กำลังค้นหา" message="กำลังเตรียมรายการที่เหมาะกับคุณ" />
          ) : products.isError ? (
            <FeedbackState title="โหลดสินค้าไม่สำเร็จ" message="กรุณาลองอีกครั้ง" actionLabel="ลองใหม่" onAction={() => products.refetch()} />
          ) : (
            <FeedbackState title="ยังไม่พบสินค้า" message="ลองเปลี่ยนคำค้นหรือเลือกหมวดหมู่อื่น" actionLabel="ล้างตัวกรอง" onAction={() => { setSearch(''); setCategoryId(undefined); }} />
          )
        }
      />
    </View>
  );
}
