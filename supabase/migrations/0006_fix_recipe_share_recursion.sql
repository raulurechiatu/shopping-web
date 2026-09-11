-- The inline EXISTS(...recipe_shares...) in the recipes SELECT policy
-- triggers recipe_shares' own RLS, whose policy in turn queries
-- recipes again ("owner can view shares on their recipes") -- a
-- cross-table recursion loop (42P17). Route the recipe_shares lookup
-- through a SECURITY DEFINER function so it bypasses recipe_shares'
-- RLS instead of re-triggering it.
create or replace function public.is_recipe_shared_with_me(target_recipe_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.recipe_shares s
    where s.recipe_id = target_recipe_id and s.user_id = auth.uid()
  );
$$;

drop policy if exists "owner or shared user can view recipes" on public.recipes;
create policy "owner or shared user can view recipes" on public.recipes
  for select using (
    owner_id = auth.uid() or public.is_recipe_shared_with_me(id)
  );
