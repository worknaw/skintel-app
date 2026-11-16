export type SelfReportedSkinType =
  | 'dry'
  | 'oily'
  | 'combination'
  | 'normal'
  | 'unsure';

export type SkinProfile = Readonly<{
  userId: string;
  skinType: SelfReportedSkinType | null;
  concernIds: readonly string[];
  avoidIngredientIds: readonly string[];
  monthlyBudgetMinor: number | null;
  budgetCurrency: string;
  onboardingCompletedAt: string | null;
}>;

