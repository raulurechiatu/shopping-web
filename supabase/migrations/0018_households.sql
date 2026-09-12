-- Households: a couple/family can share a single pantry and see each
-- other's recipes, mirroring the exact create/join-by-code pattern lists
-- already use. Favorites stay personal (still on user_items) — only
-- pantry moves to a shared, household-scoped table.

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our household',
  invite_code text not null default substr(md5(random()::text), 1, 8),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists households_invite_code_key on public.households (invite_code);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.household_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  category text,
  quantity integer not null default 1,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists household_items_household_id_lower_name_key
  on public.household_items (household_id, lower(name));

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_items enable row level security;

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = target_household_id and m.user_id = auth.uid()
  );
$$;

create policy "members can view their household" on public.households
  for select using (public.is_household_member(id));

create policy "owner can update their household" on public.households
  for update using (owner_id = auth.uid());

create policy "members can view household membership" on public.household_members
  for select using (public.is_household_member(household_id));

create policy "members can leave a household" on public.household_members
  for delete using (user_id = auth.uid());

create policy "members can view household items" on public.household_items
  for select using (public.is_household_member(household_id));

create policy "members can add household items" on public.household_items
  for insert with check (
    public.is_household_member(household_id)
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

create policy "members can update household items" on public.household_items
  for update using (public.is_household_member(household_id));

create policy "members can delete household items" on public.household_items
  for delete using (public.is_household_member(household_id));

alter publication supabase_realtime add table public.households;
alter publication supabase_realtime add table public.household_members;
alter publication supabase_realtime add table public.household_items;

-- Moves a user's personal "have at home" items into a shared household:
-- merged by name (first one in wins on a name clash), and any row that
-- was pantry-only (not also a favorite) is removed from user_items now
-- that household_items is its home.
create or replace function public.merge_pantry_into_household(target_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
begin
  for item in
    select * from public.user_items where owner_id = auth.uid() and is_pantry = true
  loop
    insert into public.household_items (household_id, name, category, quantity, added_by)
    values (target_household_id, item.name, item.category, 1, auth.uid())
    on conflict (household_id, lower(name)) do nothing;

    if item.is_favorite then
      update public.user_items set is_pantry = false where id = item.id;
    else
      delete from public.user_items where id = item.id;
    end if;
  end loop;
end;
$$;

create or replace function public.create_household(household_name text default 'Our household')
returns households
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household public.households;
begin
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Guests cannot create a household.';
  end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'You already belong to a household.';
  end if;

  insert into public.households (name, owner_id) values (household_name, auth.uid()) returning * into new_household;
  insert into public.household_members (household_id, user_id) values (new_household.id, auth.uid());
  perform public.merge_pantry_into_household(new_household.id);
  return new_household;
end;
$$;

create or replace function public.join_household_by_code(code text)
returns households
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household public.households;
begin
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Guests cannot join a household.';
  end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'You already belong to a household.';
  end if;

  select * into target_household from public.households where invite_code = code;
  if target_household.id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.household_members (household_id, user_id) values (target_household.id, auth.uid())
  on conflict do nothing;
  perform public.merge_pantry_into_household(target_household.id);
  return target_household;
end;
$$;

-- Recipes become visible to the whole household by default, alongside
-- the existing per-recipe recipe_shares mechanism for sharing with
-- people outside it.
create or replace function public.is_recipe_owner_in_my_household(target_recipe_id uuid)
returns boolean
language sql
stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.recipes r
    join public.household_members owner_hm on owner_hm.user_id = r.owner_id
    join public.household_members my_hm
      on my_hm.household_id = owner_hm.household_id and my_hm.user_id = auth.uid()
    where r.id = target_recipe_id
  );
$$;

create or replace function public.can_view_recipe(target_recipe_id uuid)
returns boolean
language sql
stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.recipes r
    where r.id = target_recipe_id
      and (
        r.owner_id = auth.uid()
        or exists (
          select 1 from public.recipe_shares s
          where s.recipe_id = r.id and s.user_id = auth.uid()
        )
        or public.is_recipe_owner_in_my_household(r.id)
      )
  );
$$;

drop policy if exists "owner or shared user can view recipes" on public.recipes;
create policy "owner, shared user, or household member can view recipes" on public.recipes
  for select using (
    owner_id = auth.uid()
    or public.is_recipe_shared_with_me(id)
    or public.is_recipe_owner_in_my_household(id)
  );
