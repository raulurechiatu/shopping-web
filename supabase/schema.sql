-- Run this in the Supabase SQL editor (Project > SQL Editor > New query)

create extension if not exists pgcrypto;

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Shopping List',
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.list_members (
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  name text not null,
  quantity text,
  is_checked boolean not null default false,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  checked_at timestamptz
);

alter table public.lists enable row level security;
alter table public.list_members enable row level security;
alter table public.list_items enable row level security;

-- Membership check as a SECURITY DEFINER function. Policies below call this
-- instead of querying list_members directly from within a list_members
-- policy, which would otherwise trigger "infinite recursion detected in
-- policy for relation list_members" (Postgres re-evaluates the same policy
-- for every row the subquery touches).
create or replace function public.is_list_member(target_list_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.list_members m
    where m.list_id = target_list_id and m.user_id = auth.uid()
  );
$$;

-- lists: a user can see/manage lists they belong to
create policy "members can view their lists" on public.lists
  for select using (public.is_list_member(id));

create policy "owner can update their list" on public.lists
  for update using (owner_id = auth.uid());

create policy "owner can delete their list" on public.lists
  for delete using (owner_id = auth.uid());

-- list_members: members can see who else is on their lists
create policy "members can view membership" on public.list_members
  for select using (public.is_list_member(list_id));

create policy "members can leave a list" on public.list_members
  for delete using (user_id = auth.uid());

-- list_items: members can view/add/update/delete items on their lists
create policy "members can view items" on public.list_items
  for select using (public.is_list_member(list_id));

create policy "members can insert items" on public.list_items
  for insert with check (public.is_list_member(list_id));

create policy "members can update items" on public.list_items
  for update using (public.is_list_member(list_id));

create policy "members can delete items" on public.list_items
  for delete using (public.is_list_member(list_id));

-- Atomically create a list and add the creator as a member
create or replace function public.create_list(list_name text default 'Shopping List')
returns public.lists
language plpgsql
security definer
set search_path = public
as $$
declare
  new_list public.lists;
begin
  insert into public.lists (name, owner_id) values (list_name, auth.uid()) returning * into new_list;
  insert into public.list_members (list_id, user_id) values (new_list.id, auth.uid());
  return new_list;
end;
$$;

-- Join an existing list via its invite code
create or replace function public.join_list_by_code(code text)
returns public.lists
language plpgsql
security definer
set search_path = public
as $$
declare
  target_list public.lists;
begin
  select * into target_list from public.lists where invite_code = code;
  if target_list.id is null then
    raise exception 'Invalid invite code';
  end if;
  insert into public.list_members (list_id, user_id) values (target_list.id, auth.uid())
  on conflict do nothing;
  return target_list;
end;
$$;

-- Enable realtime updates on list_items
alter publication supabase_realtime add table public.list_items;

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
