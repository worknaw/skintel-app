import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { useAppNotification } from '@/components/ui/app-notification';
import { FeedbackState } from '@/components/ui/feedback-state';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { productDetailQuery } from '@/features/products/application/product-queries';
import { productImageSources } from '@/features/products/ui/product-image-sources';
import { getProtectedAuthRoute } from '@/features/auth/application/auth-session';
import { useProductFavorite } from '@/features/favorites/application/use-product-favorite';
import { StorePurchaseArea } from '@/features/store/ui/store-purchase-area';


function HeaderIcon({
  icon,
  label,
  onPress,
}: {
  icon: 'arrow-left' | 'heart-outline' | 'heart' | 'share-variant-outline';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}>
      <MaterialCommunityIcons name={icon} size={27} color="#171B18" />
    </Pressable>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const product = useQuery(productDetailQuery(id ?? ''));
  const favorite = useProductFavorite(id ?? '');
  const { showNotification } = useAppNotification();

  if (product.isPending) {
    return (
      <View style={[styles.feedbackPage, { paddingTop: insets.top }]}>
        <FeedbackState title="กำลังโหลดรายละเอียด" message="อีกสักครู่ข้อมูลสินค้าจะพร้อม" />
      </View>
    );
  }

  if (product.isError) {
    return (
      <View style={[styles.feedbackPage, { paddingTop: insets.top }]}>
        <FeedbackState title="โหลดข้อมูลไม่สำเร็จ" message="กรุณาลองอีกครั้ง" actionLabel="ลองใหม่" onAction={() => product.refetch()} />
      </View>
    );
  }

  if (!product.data) {
    return (
      <View style={[styles.feedbackPage, { paddingTop: insets.top }]}>
        <FeedbackState title="ไม่พบสินค้านี้" message="สินค้าอาจถูกย้ายหรือไม่มีในระบบ" actionLabel="กลับหน้าก่อน" onAction={() => router.back()} />
      </View>
    );
  }

  const item = product.data;
  const imageSource = productImageSources[item.id];
  const { isFavorite, isUpdating, toggleFavorite: toggleStoredFavorite } = favorite;

  const handleFavoritePress = () => {
    if (isUpdating) return;
    void toggleStoredFavorite().then((result) => {
      if (result === 'authentication-required') router.push(getProtectedAuthRoute(`/product/${item.id}`, false) as never);
    }).catch(() => {
      showNotification({ title: 'บันทึกรายการโปรดไม่สำเร็จ', message: 'กรุณาลองใหม่อีกครั้ง', variant: 'error' });
    });
  };

  const shareProduct = () => {
    void Share.share({ message: `${item.brandName} ${item.name}` }).catch(() => {
      showNotification({ title: 'แชร์สินค้าไม่สำเร็จ', message: 'กรุณาลองใหม่อีกครั้ง', variant: 'error' });
    });
  };

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: Spacing.five }}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}>
        <View style={[styles.content, { paddingTop: insets.top + 4 }]}>
        <View style={styles.header}>
          <HeaderIcon icon="arrow-left" label="ย้อนกลับ" onPress={() => router.canGoBack() ? router.back() : router.replace('/discover')} />
          <View style={styles.headerActions}>
            <HeaderIcon
              icon={isFavorite ? 'heart' : 'heart-outline'}
              label={isFavorite ? 'นำออกจากรายการโปรด' : 'เพิ่มเป็นรายการโปรด'}
              onPress={handleFavoritePress}
            />
            <HeaderIcon icon="share-variant-outline" label="แชร์สินค้า" onPress={shareProduct} />
          </View>
        </View>

        <View style={styles.mediaArea}>
          <View style={styles.mainImageArea}>
            {imageSource ? <Image contentFit="contain" source={imageSource} style={styles.mainImage} /> : null}
          </View>
        </View>

        <View style={styles.details}>
          <AppText numberOfLines={2} style={styles.productName}>{`${item.brandName} ${item.name}`}</AppText>
          <View style={styles.brandRatingRow}>
            <AppText style={styles.brandName}>{item.brandName}</AppText>
          </View>
          <AppText style={styles.size}>{item.size || '250 ml.'}</AppText>

          <AppText style={styles.sectionLabel}>ส่วนผสมเด่น</AppText>
          <View style={styles.ingredientRow}>
            {item.keyIngredients.map((ingredient) => (
              <View key={ingredient} style={styles.ingredientCard}>
                <AppText numberOfLines={1} style={styles.ingredientName}>{ingredient}</AppText>
                <AppText numberOfLines={1} style={styles.ingredientBenefit}>{item.concerns[0] ?? ''}</AppText>
              </View>
            ))}
          </View>

          <AppText style={styles.sectionLabel}>เหมาะกับสภาพผิว</AppText>
          <View style={styles.skinTypeRow}>
            {item.skinTypes.map((label) => (
              <View key={label} style={styles.skinTypeChip}>
                <AppText style={styles.skinTypeText}>{label}</AppText>
              </View>
            ))}
          </View>

          <View style={styles.aboutSection}>
            <AppText style={styles.sectionLabel}>เกี่ยวกับผลิตภัณฑ์</AppText>
            <View style={styles.aboutRow}>
              <AppText numberOfLines={2} style={styles.description}>{item.description}</AppText>
              <MaterialCommunityIcons name="chevron-down" size={20} color="#222724" />
            </View>
          </View>

          <View style={styles.reviewNotice}>
            <MaterialCommunityIcons name="comment-text-outline" size={18} color={Palette.primaryDark} />
            <View style={{ flex: 1, gap: 1 }}>
              <AppText variant="button">รีวิวจากผู้ซื้อ</AppText>
              <AppText variant="caption" tone="secondary">ยังไม่มีรีวิวที่ยืนยันการซื้อ</AppText>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        </View>
      </ScrollView>
      <StorePurchaseArea productId={item.id} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFEFC' },
  scrollView: { flex: 1 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  feedbackPage: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.five,
    backgroundColor: Palette.background,
  },
  header: {
    height: 52,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  headerIcon: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.58 },
  mediaArea: { height: 252, paddingHorizontal: 18 },
  mainImageArea: { flex: 1, borderRadius: Radius.card, backgroundColor: '#F7F6F1', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mainImage: { width: '76%', height: 234 },
  details: { paddingHorizontal: 18, paddingTop: 12 },
  productName: {
    fontFamily: 'NotoSansThai_600SemiBold',
    fontSize: 19,
    lineHeight: 26,
    color: '#1C211E',
  },
  brandRatingRow: {
    minHeight: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandName: { fontSize: 12, lineHeight: 18, color: '#777C78' },
  price: {
    marginTop: 2,
    fontFamily: 'NotoSansThai_600SemiBold',
    fontSize: 19,
    lineHeight: 27,
    color: '#F06422',
  },
  size: { marginTop: 1, fontSize: 12, lineHeight: 18, color: '#777C78' },
  sectionLabel: {
    marginTop: 11,
    marginBottom: 7,
    fontFamily: 'NotoSansThai_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: '#252A27',
  },
  ingredientRow: { flexDirection: 'row', gap: 7 },
  ingredientCard: {
    flex: 1,
    minWidth: 0,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F0F6EF',
    paddingHorizontal: 9,
    justifyContent: 'center',
  },
  ingredientName: {
    fontFamily: 'NotoSansThai_600SemiBold',
    fontSize: 11,
    lineHeight: 16,
    color: '#326148',
  },
  ingredientBenefit: { fontSize: 10, lineHeight: 15, color: '#5E655F' },
  skinTypeRow: { flexDirection: 'row', gap: 6 },
  skinTypeChip: {
    flex: 1,
    minWidth: 0,
    height: 34,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: '#E0E9DE',
    backgroundColor: '#F1F7F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  skinTypeText: { fontSize: 10, lineHeight: 15, color: '#37664E' },
  aboutSection: { paddingBottom: 13 },
  aboutRow: { minHeight: 45, flexDirection: 'row', alignItems: 'center', gap: 8 },
  description: { flex: 1, fontSize: 12, lineHeight: 19, color: '#454B47' },
  divider: { height: 1, backgroundColor: '#ECEDE9' },
  reviewNotice: { minHeight: 62, marginBottom: 16, paddingHorizontal: 12, borderRadius: Radius.input, backgroundColor: '#F0F6EF', flexDirection: 'row', alignItems: 'center', gap: 9 },
  storeSection: { paddingHorizontal: 18, paddingTop: 13 },
  storeHeading: {
    marginBottom: 9,
    fontFamily: 'NotoSansThai_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: '#252A27',
  },
  storeRow: { flexDirection: 'row', gap: 6 },
  storeCard: {
    flex: 1,
    minWidth: 0,
    height: 82,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E4E5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  storeName: {
    flex: 1,
    fontFamily: 'NotoSansThai_600SemiBold',
    fontSize: 11,
    lineHeight: 16,
    color: '#303532',
  },
  storePrice: {
    fontFamily: 'NotoSansThai_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: '#202522',
  },
});
