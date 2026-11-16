import type { ProductSummary, RoutineRole } from '@/features/products/domain/product';
import { isFreshScanRoutineInsight, type ScanRoutineInsight } from '@/features/skin-analysis/domain/scan-routine-insight';
import type { SkinProfile } from '@/features/skin-profile/domain/skin-profile';
import type { CycleDayType, RoutinePeriod } from '@/features/routines/domain/routine';
import { plannedDayMeta, type SkinCyclingPlanDay } from '@/features/routines/domain/skin-cycling-plan';

export type SuggestedRoutineStep = Readonly<{
  id: string;
  role: RoutineRole;
  title: string;
  reason: string;
  product: ProductSummary | null;
}>;

export type DailyRoutine = Readonly<{
  date: string;
  cycleDay: CycleDayType;
  cycleLabel: string;
  scanNote: string | null;
  morning: readonly SuggestedRoutineStep[];
  evening: readonly SuggestedRoutineStep[];
}>;

const labels: Record<CycleDayType, string> = {
  active: 'Active night',
  recovery: 'Recovery night',
  rest: 'Rest night',
  hydration: 'Hydration night',
};

const genericTitles: Record<RoutineRole, string> = {
  cleanser: 'ล้างหน้าอย่างอ่อนโยน',
  hydrator: 'เติมความชุ่มชื้น',
  treatment: 'ใช้ผลิตภัณฑ์บำรุงเฉพาะจุด',
  moisturizer: 'ล็อกความชุ่มชื้น',
  sunscreen: 'ทากันแดด',
};

function atLocalMidnight(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

export function getLocalDateKey(value = new Date()) {
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${value.getFullYear()}-${month}-${day}`;
}

export function getCycleDay(date: Date, onboardingCompletedAt: string | null): CycleDayType {
  const anchor = onboardingCompletedAt ? new Date(onboardingCompletedAt) : date;
  const elapsedDays = Math.max(0, Math.floor((atLocalMidnight(date) - atLocalMidnight(anchor)) / 86_400_000));
  return (['active', 'recovery', 'rest', 'hydration'] as const)[elapsedDays % 4];
}

function pickProduct(products: readonly ProductSummary[], role: RoutineRole) {
  return products.find((product) => product.routineRoles.includes(role)) ?? null;
}

function normalizeIngredient(value: string) {
  return value.trim().toLocaleLowerCase();
}

/** Only returns a same-role product when it shares a declared key ingredient. */
export function findCompatibleAlternatives(current: ProductSummary | null, products: readonly ProductSummary[], role: RoutineRole) {
  if (!current?.keyIngredients?.length) return [];
  const currentIngredients = new Set(current.keyIngredients.map(normalizeIngredient));
  return products.filter((candidate) => candidate.id !== current.id
    && candidate.routineRoles.includes(role)
    && candidate.keyIngredients?.some((ingredient) => currentIngredients.has(normalizeIngredient(ingredient))));
}

function step(role: RoutineRole, reason: string, products: readonly ProductSummary[]): SuggestedRoutineStep {
  const product = pickProduct(products, role);
  return {
    id: role,
    role,
    title: product ? `${product.brandName} ${product.name}` : genericTitles[role],
    reason,
    product,
  };
}

/** Builds a daily checklist from a server-generated plan. The plan determines
 * the allowed roles; product matching stays local so catalog changes do not
 * rewrite a customer's completed checklist. */
export function buildDailyRoutineFromPlan(
  products: readonly ProductSummary[],
  day: SkinCyclingPlanDay,
): DailyRoutine {
  const cycleDay: CycleDayType = day.dayType === 'exfoliate' ? 'active'
    : day.dayType === 'hydrate' ? 'hydration'
      : day.dayType === 'recovery' ? 'recovery' : 'rest';
  const roleReason: Partial<Record<RoutineRole, string>> = {
    cleanser: 'ทำความสะอาดอย่างอ่อนโยนโดยไม่ทำให้ผิวตึง',
    hydrator: day.dayType === 'hydrate' ? 'เพิ่มความชุ่มชื้นให้ผิวตามแผนวันนี้' : 'เติมความชุ่มชื้นหลังล้างหน้า',
    moisturizer: day.dayType === 'recovery' ? 'ช่วยปลอบประโลมและดูแลเกราะผิว' : 'ล็อกความชุ่มชื้นให้ผิว',
    sunscreen: 'ช่วยปกป้องผิวระหว่างวัน',
    treatment: 'คืนนี้เป็นคืนผลัดเซลล์ ใช้ผลิตภัณฑ์บำรุงเฉพาะหนึ่งชนิดตามแผน และหยุดใช้หากระคายเคือง',
  };
  const makeSteps = (list: readonly RoutineRole[]) => list.map((role) => step(role, roleReason[role] ?? day.rationale, products));
  return {
    date: day.routineDate,
    cycleDay,
    cycleLabel: plannedDayMeta[day.dayType].label,
    scanNote: day.rationale,
    morning: makeSteps(day.morningRoles),
    evening: makeSteps(day.eveningRoles),
  };
}

export function buildDailyRoutine(profile: SkinProfile | null, products: readonly ProductSummary[], date = new Date(), latestScan: ScanRoutineInsight | null = null): DailyRoutine {
  const plannedCycleDay = getCycleDay(date, profile?.onboardingCompletedAt ?? null);
  const needsRecovery = Boolean(latestScan && isFreshScanRoutineInsight(latestScan, date) && latestScan.score < 60);
  const cycleDay = needsRecovery ? 'recovery' : plannedCycleDay;
  const concern = needsRecovery
    ? 'ผลสแกนล่าสุดแนะนำให้เน้นความอ่อนโยนและความชุ่มชื้นในช่วงนี้'
    : profile?.concernIds.includes('dryness') ? 'ลดความแห้งตึงและช่วยดูแลเกราะผิว' : 'ดูแลผิวอย่างสมดุลและอ่อนโยน';
  const morning = [
    step('cleanser', 'เริ่มด้วยการทำความสะอาดโดยไม่ทำให้ผิวตึง', products),
    step('hydrator', 'เติมน้ำให้ผิวก่อนการบำรุงขั้นต่อไป', products),
    step('moisturizer', concern, products),
    step('sunscreen', 'ช่วยปกป้องผิวระหว่างวัน', products),
  ];
  const evening = [
    step('cleanser', 'ล้างสิ่งสกปรกและกันแดดออกก่อนพักผ่อน', products),
    step('hydrator', 'เติมความชุ่มชื้นหลังล้างหน้า', products),
    ...(cycleDay === 'active' ? [step('treatment', 'คืนนี้เป็น Active night ใช้เพียงขั้นตอนที่ผิวรับไหว', products)] : []),
    step('moisturizer', cycleDay === 'active' ? 'ปิดท้ายด้วยมอยส์เจอไรเซอร์เพื่อลดความแห้งตึง' : 'ให้ผิวฟื้นตัวด้วยการบำรุงที่เรียบง่าย', products),
  ];
  const scanNote = needsRecovery
    ? 'ปรับเป็น Recovery night ชั่วคราวจากคะแนนสแกนล่าสุด เพื่อหลีกเลี่ยงการเพิ่มสารออกฤทธิ์หลายขั้นตอน'
    : latestScan && isFreshScanRoutineInsight(latestScan, date)
      ? `ใช้ผลสแกนล่าสุดประกอบการจัดรูทีน (พบสิวโดยประมาณ ${latestScan.acneCount} จุด)`
      : null;
  return { date: getLocalDateKey(date), cycleDay, cycleLabel: labels[cycleDay], scanNote, morning, evening };
}

export function routinePeriodLabel(period: RoutinePeriod) {
  return period === 'am' ? 'รูทีนตอนเช้า' : 'รูทีนตอนเย็น';
}
