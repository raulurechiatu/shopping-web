-- Remembers every distinct item ever added to a list so the UI can offer
-- one-tap re-add suggestions, ranked by how often/recently they're used.

create table if not exists public.list_item_catalog (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  name text not null,
  use_count integer not null default 1,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists list_item_catalog_list_id_lower_name_key
  on public.list_item_catalog (list_id, lower(name));

alter table public.list_item_catalog enable row level security;

create policy "members can view catalog" on public.list_item_catalog
  for select using (public.is_list_member(list_id));

-- Keep the catalog in sync automatically whenever an item is added, so the
-- app doesn't need a second write for every add.
create or replace function public.upsert_item_catalog()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.list_item_catalog (list_id, name, use_count, last_used_at)
  values (new.list_id, new.name, 1, now())
  on conflict (list_id, lower(name))
  do update set
    use_count = public.list_item_catalog.use_count + 1,
    last_used_at = now(),
    name = excluded.name;
  return new;
end;
$$;

drop trigger if exists trg_upsert_item_catalog on public.list_items;
create trigger trg_upsert_item_catalog
  after insert on public.list_items
  for each row execute function public.upsert_item_catalog();

alter publication supabase_realtime add table public.list_item_catalog;
