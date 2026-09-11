-- Guests (anonymous sign-ins) should only ever be able to interact with
-- the specific list they were invited to: not create new lists, and not
-- touch recipes at all (recipes are now a signed-in-account-only
-- feature, including viewing one shared via invite code).
--
-- The app UI already hides these entry points for guests; these checks
-- are the real enforcement boundary in case of a direct API call.

create or replace function public.create_list(list_name text default 'Shopping List')
returns public.lists
language plpgsql
security definer
set search_path = public
as $$
declare
  new_list public.lists;
begin
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Guests cannot create new lists.';
  end if;

  insert into public.lists (name, owner_id) values (list_name, auth.uid()) returning * into new_list;
  insert into public.list_members (list_id, user_id) values (new_list.id, auth.uid());
  return new_list;
end;
$$;

create or replace function public.join_recipe_by_code(code text)
returns public.recipes
language plpgsql
security definer
set search_path = public
as $$
declare
  target_recipe public.recipes;
begin
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Sign in with an account to view shared recipes.';
  end if;

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

drop policy if exists "owner can insert their recipes" on public.recipes;
create policy "owner can insert their recipes" on public.recipes
  for insert with check (
    owner_id = auth.uid() and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );
