import { formatMoney } from './format-money';

describe('formatMoney', () => {
  it('formats minor units as Thai baht', () => {
    const formatted = formatMoney({ amountMinor: 39000, currency: 'THB' });

    expect(formatted).toContain('390');
    expect(formatted).toContain('฿');
  });

  it('returns a useful label when a product has no price', () => {
    expect(formatMoney(null)).toBe('ยังไม่มีราคา');
  });
});
