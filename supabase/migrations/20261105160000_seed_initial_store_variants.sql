-- Initial storefront values approved as sample data. Replace price and stock
-- with the store's real inventory before accepting customer orders.
insert into public.store_variants (product_id, sku, label, price_minor, stock, active) values
  ('anua-heartleaf-toner', 'SKIN-ANUA-HT77-250', '250 ml', 69000, 18, true),
  ('verda-barrier-cream', 'SKIN-VERDA-CBC-50', '50 ml', 59000, 12, true),
  ('the-ordinary-niacinamide', 'SKIN-TO-NIA-30', '30 ml', 39000, 16, true),
  ('beauty-of-joseon-relief-sun', 'SKIN-BOJ-RSUN-40', '40 ml', 59000, 20, true),
  ('peach-pine-bha', 'SKIN-PP-BHA-30', '30 ml', 69000, 10, true),
  ('aqua-form-essence', 'SKIN-AF-THA-100', '100 ml', 42000, 14, true),
  ('mellow-ceramide-milk', 'SKIN-MS-CRM-80', '80 ml', 48000, 12, true),
  ('green-theory-cica-gel', 'SKIN-GT-CICA-60', '60 ml', 35000, 15, true)
on conflict (sku) do nothing;
