-- Recipes can be shared read-only via an invite code, mirroring how
-- lists work but without granting edit/delete rights to the recipient.

alter table public.recipes add column if not exists invite_code text unique
  default substr(md5(random()::text), 1, 8);

-- Backfill any existing rows created before the column had a default.
update public.recipes set invite_code = substr(md5(random()::text || id::text), 1, 8)
  where invite_code is null;

alter table public.recipes alter column invite_code set not null;

create table if not exists public.recipe_shares (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  shared_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

alter table public.recipe_shares enable row level security;

-- Whether the caller can view a recipe: they own it, or it was shared
-- with them. SECURITY DEFINER so recipe_shares policies below can use
-- this without re-triggering their own RLS.
create or replace function public.can_view_recipe(target_recipe_id uuid)
returns boolean
language sql
security definer
stable
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
      )
  );
$$;

-- Extend recipes/recipe_ingredients SELECT to include shared viewers.
-- Insert/update/delete stay owner-only (unchanged from migration 0003).
drop policy if exists "owner can view their recipes" on public.recipes;
create policy "owner or shared user can view recipes" on public.recipes
  for select using (public.can_view_recipe(id));

drop policy if exists "owner can view recipe ingredients" on public.recipe_ingredients;
create policy "owner or shared user can view recipe ingredients" on public.recipe_ingredients
  for select using (public.can_view_recipe(recipe_id));

-- recipe_shares: the owner manages shares on their own recipes; a
-- recipient can see and remove their own share (stop following it).
create policy "owner can view shares on their recipes" on public.recipe_shares
  for select using (
    exists (select 1 from public.recipes r where r.id = recipe_shares.recipe_id and r.owner_id = auth.uid())
    or user_id = auth.uid()
  );

create policy "owner can revoke shares on their recipes" on public.recipe_shares
  for delete using (
    exists (select 1 from public.recipes r where r.id = recipe_shares.recipe_id and r.owner_id = auth.uid())
    or user_id = auth.uid()
  );

-- Join a shared recipe via its invite code (read-only access).
create or replace function public.join_recipe_by_code(code text)
returns public.recipes
language plpgsql
security definer
set search_path = public
as $$
declare
  target_recipe public.recipes;
begin
  select * into target_recipe from public.recipes where invite_code = code;
  if target_recipe.id is null then
    raise exception 'Invalid invite code';
  end if;
  if target_recipe.owner_id <> auth.uid() then
    insert into public.recipe_shares (recipe_id, user_id) values (target_recipe.id, auth.uid())
    on conflict do nothing;
  end if;
  return target_recipe;
end;
$$;
