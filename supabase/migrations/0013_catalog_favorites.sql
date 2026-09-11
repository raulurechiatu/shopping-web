-- Lets someone pin specific items in a list's catalog as "usual buys" so
-- they always show up in Quick Add (not just whatever was used most
-- recently) and can be bulk-added in one tap.

alter table public.list_item_catalog add column if not exists is_favorite boolean not null default false;

create policy "members can update catalog" on public.list_item_catalog
  for update using (public.is_list_member(list_id));
