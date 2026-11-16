import { supabase } from '@/core/supabase/client';
import type { SkinProfile } from '@/features/skin-profile/domain/skin-profile';

export type SkinProfileConsent = Readonly<{ id: string; title: string; body: string }>;

type SkinProfileRow = {
  user_id: string;
  skin_type: SkinProfile['skinType'];
  concern_ids: string[];
  avoid_ingredient_ids: string[];
  monthly_budget_minor: number | null;
  budget_currency: string;
  onboarding_completed_at: string | null;
};

export type SkinProfileDraft = Readonly<{
  skinType: SkinProfile['skinType'];
  concernIds: readonly string[];
  avoidIngredientIds: readonly string[];
  monthlyBudgetMinor: number | null;
  consentVersionId: string;
}>;

export async function getActiveSkinProfileConsent(): Promise<SkinProfileConsent> {
  const { data, error } = await supabase.from('consent_versions')
    .select('id,title,body').eq('scope', 'skin_profile').eq('active', true)
    .order('published_at', { ascending: false }).limit(1).maybeSingle<SkinProfileConsent>();
  if (error) throw error;
  if (!data) throw new Error('Skin profile consent is unavailable');
  return data;
}

function toSkinProfile(row: SkinProfileRow): SkinProfile {
  return {
    userId: row.user_id,
    skinType: row.skin_type,
    concernIds: row.concern_ids,
    avoidIngredientIds: row.avoid_ingredient_ids,
    monthlyBudgetMinor: row.monthly_budget_minor,
    budgetCurrency: row.budget_currency,
    onboardingCompletedAt: row.onboarding_completed_at,
  };
}

export async function getSkinProfile(userId: string, signal?: AbortSignal): Promise<SkinProfile | null> {
  let request = supabase
    .from('skin_profiles')
    .select('user_id, skin_type, concern_ids, avoid_ingredient_ids, monthly_budget_minor, budget_currency, onboarding_completed_at')
    .eq('user_id', userId);
  if (signal) request = request.abortSignal(signal);
  const result = await request.maybeSingle<SkinProfileRow>();
  if (result.error) throw result.error;
  return result.data ? toSkinProfile(result.data) : null;
}

export async function completeSkinOnboarding(draft: SkinProfileDraft): Promise<SkinProfile> {
  const result = await supabase.rpc('complete_skin_onboarding', {
    p_skin_type: draft.skinType,
    p_concern_ids: [...draft.concernIds],
    p_avoid_ingredient_ids: [...draft.avoidIngredientIds],
    p_monthly_budget_minor: draft.monthlyBudgetMinor,
    p_consent_version_id: draft.consentVersionId,
  });
  if (result.error) throw result.error;
  return toSkinProfile(result.data as SkinProfileRow);
}
