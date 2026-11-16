export type ProductId = string;

export type ProductCategoryId =
  | 'cleanser'
  | 'essence'
  | 'serum'
  | 'moisturizer'
  | 'sunscreen'
  | 'treatment';

export type Money = Readonly<{
  amountMinor: number;
  currency: string;
}>;

export type RoutineRole =
  | 'cleanser'
  | 'hydrator'
  | 'treatment'
  | 'moisturizer'
  | 'sunscreen';

export type ProductSummary = Readonly<{
  id: ProductId;
  brandName: string;
  name: string;
  imageUrl: string | null;
  categoryId: ProductCategoryId;
  reviewCount: number;
  startingPrice: Money | null;
  tags: readonly string[];
  /** Used only to find like-for-like routine alternatives. */
  keyIngredients?: readonly string[];
  routineRoles: readonly RoutineRole[];
}>;

export type Product = ProductSummary &
  Readonly<{
    size: string;
    rating: number | null;
    description: string;
    keyIngredients: readonly string[];
    ingredientList: readonly string[];
    skinTypes: readonly string[];
    concerns: readonly string[];
  }>;

export type ProductSort = 'popular' | 'price-asc' | 'price-desc' | 'recent';

export type ProductQuery = Readonly<{
  search?: string;
  categoryId?: ProductCategoryId;
  sort?: ProductSort;
  cursor?: string;
  limit: number;
}>;

export type ProductPage = Readonly<{
  items: readonly ProductSummary[];
  nextCursor: string | null;
  total: number;
}>;
