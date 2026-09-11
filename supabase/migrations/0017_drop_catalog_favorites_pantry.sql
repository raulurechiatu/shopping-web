-- is_favorite/is_pantry on list_item_catalog were superseded by the
-- user_items table (migration 0015) and no code has read or written them
-- since. The update policy below existed solely to let the client toggle
-- these two columns, so it's dead along with them.
drop policy if exists "members can update catalog" on public.list_item_catalog;

alter table public.list_item_catalog drop column if exists is_favorite;
alter table public.list_item_catalog drop column if exists is_pantry;
