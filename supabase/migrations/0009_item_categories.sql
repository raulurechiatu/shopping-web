-- Grocery-aisle category per item, so the list can be grouped (Produce,
-- Dairy, Meat, ...). Nullable: existing rows fall back to client-side
-- auto-detection (getItemCategory) until they're next touched.
alter table public.list_items add column if not exists category text;
alter table public.list_item_catalog add column if not exists category text;
