-- Carry the item's category into its catalog entry too, so quick-add
-- suggestions remember the last category the item was filed under.
create or replace function public.upsert_item_catalog()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.list_item_catalog (list_id, name, category, use_count, last_used_at)
  values (new.list_id, new.name, new.category, 1, now())
  on conflict (list_id, lower(name))
  do update set
    use_count = public.list_item_catalog.use_count + 1,
    last_used_at = now(),
    name = excluded.name,
    category = coalesce(excluded.category, public.list_item_catalog.category);
  return new;
end;
$$;
