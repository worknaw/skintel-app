import { escapeProductSearch, mapProductSummary, normalizeProductQuery } from './supabase-product-repository';

jest.mock('@/core/supabase/client', () => ({ supabase: {} }));

describe('Supabase product mapping', () => {
  it('clamps a catalogue query to the supported page size', () => {
    expect(normalizeProductQuery({ limit: 99, sort: 'popular' })).toEqual({ limit: 30, sort: 'popular' });
  });

  it('escapes PostgREST wildcard characters in a product search', () => {
    expect(escapeProductSearch('SPF 50%_')).toBe('SPF 50\\%\\_');
  });

  it('normalizes invalid and fractional page sizes', () => {
    for (const limit of [NaN, Infinity, -Infinity]) expect(normalizeProductQuery({ limit }).limit).toBe(30);
    expect(normalizeProductQuery({ limit: 5.9 }).limit).toBe(5);
    expect(normalizeProductQuery({ limit: -3 }).limit).toBe(1);
    expect(escapeProductSearch('a\\b%_')).toBe('a\\\\b\\%\\_');
  });

  it('maps a database summary row into the existing domain shape', () => {
    expect(mapProductSummary({ id: 'p1', name: 'Product', category_id: 'serum', tags: ['เติมน้ำ'], review_count: 614, routine_roles: ['treatment'], brands: { name: 'Brand' }, variants: [{ price_minor: 59000, currency: 'THB' }] })).toMatchObject({ id: 'p1', brandName: 'Brand', startingPrice: { amountMinor: 59000, currency: 'THB' }, reviewCount: 614, routineRoles: ['treatment'] });
  });
});
