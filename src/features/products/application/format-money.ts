import type { Money } from '@/features/products/domain/product';

export function formatMoney(money: Money | null) {
  if (!money) return 'ยังไม่มีราคา';

  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: money.currency,
    maximumFractionDigits: 0,
  }).format(money.amountMinor / 100);
}
