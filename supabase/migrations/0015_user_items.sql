-- A personal, account-level item registry — "things I favorite / have at
-- home" — decoupled from any specific shopping list. Replaces using
-- list_item_catalog.is_favorite/is_pantry for this purpose, which forced
-- everything to be scoped (and duplicated) per list.
create table if not exists public.user_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  is_favorite boolean not null default false,
  is_pantry boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists user_items_owner_lower_name_key
  on public.user_items (owner_id, lower(name));

alter table public.user_items enable row level security;

-- Personal feature, same as recipes/list-creation — guests (anonymous
-- sign-ins) only ever interact with the list they were invited to.
create policy "owner can view their items" on public.user_items
  for select using (owner_id = auth.uid());

create policy "owner can insert their items" on public.user_items
  for insert with check (
    owner_id = auth.uid() and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

create policy "owner can update their items" on public.user_items
  for update using (owner_id = auth.uid());

create policy "owner can delete their items" on public.user_items
  for delete using (owner_id = auth.uid());

alter publication supabase_realtime add table public.user_items;
