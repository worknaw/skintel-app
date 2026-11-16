alter table public.products add column search_text text not null default '';

create function public.populate_product_search_text()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  brand_name text;
begin
  select b.name into brand_name from public.brands as b where b.id = new.brand_id;
  new.search_text := lower(concat_ws(' ', brand_name, new.name, array_to_string(new.tags, ' '), array_to_string(new.key_ingredients, ' '), array_to_string(new.concerns, ' ')));
  return new;
end;
$$;

create trigger products_populate_search_text
before insert or update of brand_id, name, tags, key_ingredients, concerns on public.products
for each row execute function public.populate_product_search_text();

create function public.sync_brand_product_search_text()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.products
  set search_text = lower(concat_ws(' ', new.name, name, array_to_string(tags, ' '), array_to_string(key_ingredients, ' '), array_to_string(concerns, ' ')))
  where brand_id = new.id;
  return new;
end;
$$;

create trigger brands_sync_product_search_text
after update of name on public.brands
for each row execute function public.sync_brand_product_search_text();

update public.products
set search_text = lower(concat_ws(' ', b.name, products.name, array_to_string(products.tags, ' '), array_to_string(products.key_ingredients, ' '), array_to_string(products.concerns, ' ')))
from public.brands as b
where b.id = products.brand_id;
