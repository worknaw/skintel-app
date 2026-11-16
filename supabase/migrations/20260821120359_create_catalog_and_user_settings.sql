create table public.brands (id text primary key, name text not null unique);
create table public.categories (id text primary key, label text not null);
create table public.products (
  id text primary key,
  brand_id text not null references public.brands(id),
  name text not null,
  category_id text not null references public.categories(id),
  size text not null,
  rating numeric(2,1), review_count integer not null check (review_count >= 0),
  description text not null, tags text[] not null default '{}', routine_roles text[] not null default '{}',
  key_ingredients text[] not null default '{}', ingredient_list text[] not null default '{}',
  skin_types text[] not null default '{}', concerns text[] not null default '{}',
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.store_offers (
  id text primary key, product_id text not null references public.products(id) on delete cascade,
  store_name text not null, price_minor integer not null check (price_minor >= 0), currency char(3) not null check (currency = upper(currency)),
  product_url text not null check (product_url ~ '^https://'), available boolean not null default true, last_updated_at timestamptz not null
);
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  routine_morning boolean not null default false, routine_evening boolean not null default false,
  skin_cycling boolean not null default false, reanalysis_reminder boolean not null default false,
  promotions boolean not null default false, image_analysis boolean not null default false,
  recommendation_personalization boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index products_active_category_idx on public.products (category_id) where active;
create index store_offers_product_available_price_idx on public.store_offers (product_id, price_minor) where available;
grant select on public.brands, public.categories, public.products, public.store_offers to anon, authenticated;
grant select, insert, update on public.user_settings to authenticated;
alter table public.brands enable row level security; alter table public.categories enable row level security; alter table public.products enable row level security; alter table public.store_offers enable row level security; alter table public.user_settings enable row level security;
create policy "catalog_brands_read" on public.brands for select to anon, authenticated using (true);
create policy "catalog_categories_read" on public.categories for select to anon, authenticated using (true);
create policy "catalog_products_read" on public.products for select to anon, authenticated using (active);
create policy "catalog_offers_read" on public.store_offers for select to anon, authenticated using (available);
create policy "user_settings_select_own" on public.user_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_settings_insert_own" on public.user_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_settings_update_own" on public.user_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
insert into public.categories (id,label) values ('cleanser','คลีนเซอร์'),('essence','เอสเซนส์'),('serum','เซรั่ม'),('moisturizer','มอยส์เจอไรเซอร์'),('sunscreen','กันแดด'),('treatment','ทรีตเมนต์');
insert into public.brands (id,name) values ('anua','Anua'),('verda','VERDA'),('the-ordinary','The Ordinary'),('beauty-of-joseon','Beauty of Joseon'),('peach-pine','PEACH & PINE'),('aqua-form','AQUA FORM'),('mellow-skin','MELLOW SKIN'),('green-theory','GREEN THEORY');
insert into public.products (id,brand_id,name,category_id,size,rating,review_count,description,tags,routine_roles,key_ingredients,ingredient_list,skin_types,concerns) values
('anua-heartleaf-toner','anua','Heartleaf 77% Soothing Toner','essence','250 ml',4.8,2280,'โทนเนอร์ Heartleaf สำหรับเติมความชุ่มชื้นและปลอบประโลมผิว เหมาะกับการใช้เป็นขั้นตอนแรกหลังทำความสะอาด',array['ปลอบประโลม','เติมความชุ่มชื้น'],array['hydrator'],array['Heartleaf 77%','Panthenol','Betaine'],array['Houttuynia Cordata Extract','Water','Glycerin','Panthenol','Betaine'],array['ทุกสภาพผิว','ผิวแพ้ง่าย'],array['รอยแดง','ผิวระคายเคืองง่าย']),
('verda-barrier-cream','verda','Calm Barrier Cream','moisturizer','50 ml',4.9,512,'ครีมบำรุงเนื้อเบาสำหรับวันที่ผิวต้องการพัก ช่วยเสริมเกราะป้องกันผิวและลดความรู้สึกแห้งตึง',array['Barrier Repair','ปลอบประโลม'],array['moisturizer'],array['Ceramide NP','Squalane','Centella'],array['Water','Glycerin','Squalane','Ceramide NP','Centella Asiatica'],array['ทุกสภาพผิว','ผิวแห้ง','ผิวแพ้ง่าย'],array['Skin Barrier','ความแห้ง','รอยแดง']),
('the-ordinary-niacinamide','the-ordinary','Niacinamide 10% + Zinc 1%','serum','30 ml',4.7,1840,'เซรั่มสูตรน้ำที่ช่วยดูแลความมัน ความไม่เรียบเนียน และรูขุมขน พร้อมสนับสนุนเกราะป้องกันผิว',array['ลดสิว','คุมมัน'],array['treatment'],array['Niacinamide 10%','Zinc PCA'],array['Water','Niacinamide','Propanediol','Zinc PCA','Allantoin'],array['ผิวมัน','ผิวผสม'],array['ความมัน','รูขุมขน','สีผิวไม่สม่ำเสมอ']),
('beauty-of-joseon-relief-sun','beauty-of-joseon','Relief Sun SPF50+ PA++++','sunscreen','40 ml',4.8,1590,'กันแดดเนื้อครีมบางเบาที่มี Rice Extract และ Probiotics ช่วยปกป้องผิวพร้อมให้ความชุ่มชื้นโดยไม่หนักผิว',array['กันแดด','ไม่เหนอะหนะ'],array['sunscreen'],array['Rice Extract','Probiotics','Niacinamide'],array['Water','Rice Extract','Niacinamide','Fermented Grain Extracts'],array['ทุกสภาพผิว'],array['ปกป้องผิวจากแสงแดด','รอยดำ']),
('peach-pine-bha','peach-pine','Clear Night BHA 2%','treatment','30 ml',4.6,198,'ผลิตภัณฑ์ผลัดเซลล์ผิวสำหรับคืน Active ใช้ตามความถี่ที่เหมาะสมและควรหลีกเลี่ยงการใช้ร่วมกับสารออกฤทธิ์แรงชนิดอื่น',array['BHA','Active Night'],array['treatment'],array['Salicylic Acid 2%','Beta-Glucan'],array['Water','Methylpropanediol','Salicylic Acid','Beta-Glucan'],array['ผิวมัน','ผิวเป็นสิวง่าย'],array['สิวอุดตัน','รูขุมขน']),
('aqua-form-essence','aqua-form','Triple HA Essence','essence','100 ml',4.7,241,'เอสเซนส์เติมความชุ่มชื้นเนื้อบางเบา ใช้ได้ทั้งเช้าและเย็น เหมาะกับวัน Recovery และ Hydration',array['เติมน้ำ','ผิวอิ่มฟู'],array['hydrator'],array['Hyaluronic Acid','Betaine','Panthenol'],array['Water','Glycerin','Sodium Hyaluronate','Betaine','Panthenol'],array['ทุกสภาพผิว','ผิวแห้ง'],array['ความแห้ง','ผิวขาดน้ำ']),
('mellow-ceramide-milk','mellow-skin','Ceramide Recovery Milk','moisturizer','80 ml',4.8,167,'มอยส์เจอไรเซอร์เนื้อน้ำนมสำหรับปลอบประโลมและดูแลเกราะป้องกันผิวโดยไม่หนักผิว',array['Recovery','Ceramide'],array['moisturizer'],array['Ceramide Complex','Oat','Squalane'],array['Water','Glycerin','Avena Sativa','Squalane','Ceramide NP'],array['ผิวผสม','ผิวแห้ง','ผิวแพ้ง่าย'],array['Skin Barrier','รอยแดง']),
('green-theory-cica-gel','green-theory','Cica Recovery Gel','moisturizer','60 ml',4.5,139,'เจลบำรุงผิวเนื้อสบาย ช่วยลดความรู้สึกไม่สบายผิวและเหมาะกับผู้ที่ต้องการควบคุมงบประมาณ',array['ปลอบประโลม','งบประหยัด'],array['moisturizer'],array['Centella','Madecassoside','Allantoin'],array['Water','Centella Asiatica','Madecassoside','Allantoin'],array['ผิวมัน','ผิวผสม','ผิวแพ้ง่าย'],array['รอยแดง','ระคายเคือง']);
insert into public.store_offers (id,product_id,store_name,price_minor,currency,product_url,available,last_updated_at) values
('offer-dewdrop-1','anua-heartleaf-toner','Glow Market',69000,'THB','https://anua.com/',true,'2026-08-18T08:00:00Z'),('offer-dewdrop-2','anua-heartleaf-toner','Beauty Corner',72000,'THB','https://anua.com/',true,'2026-08-17T08:00:00Z'),('offer-verda-1','verda-barrier-cream','Skin Select',59000,'THB','https://example.com/verda-barrier-cream',true,'2026-08-19T08:00:00Z'),('offer-verda-2','verda-barrier-cream','Glow Market',62000,'THB','https://example.com/verda-barrier-cream-2',true,'2026-08-18T08:00:00Z'),('offer-verda-3','verda-barrier-cream','Everyday Beauty',65000,'THB','https://example.com/verda-barrier-cream-3',false,'2026-08-16T08:00:00Z'),('offer-nura-1','the-ordinary-niacinamide','Everyday Beauty',35000,'THB','https://theordinary.com/en-us/niacinamide-10-zinc-1-serum-100436.html',true,'2026-08-19T08:00:00Z'),('offer-nura-2','the-ordinary-niacinamide','Skin Select',39000,'THB','https://theordinary.com/en-us/niacinamide-10-zinc-1-serum-100436.html',true,'2026-08-18T08:00:00Z'),('offer-solune-1','beauty-of-joseon-relief-sun','Glow Market',59000,'THB','https://beautyofjoseon.com/',true,'2026-08-20T08:00:00Z'),('offer-solune-2','beauty-of-joseon-relief-sun','Beauty Corner',65000,'THB','https://beautyofjoseon.com/',true,'2026-08-19T08:00:00Z'),('offer-bha-1','peach-pine-bha','Skin Select',69000,'THB','https://example.com/peach-pine-bha',true,'2026-08-18T08:00:00Z'),('offer-aqua-1','aqua-form-essence','Beauty Corner',42000,'THB','https://example.com/aqua-form-essence',true,'2026-08-17T08:00:00Z'),('offer-mellow-1','mellow-ceramide-milk','Everyday Beauty',48000,'THB','https://example.com/mellow-ceramide-milk',true,'2026-08-19T08:00:00Z'),('offer-cica-1','green-theory-cica-gel','Glow Market',35000,'THB','https://example.com/green-theory-cica',true,'2026-08-20T08:00:00Z');
