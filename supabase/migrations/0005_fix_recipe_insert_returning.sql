-- can_view_recipe() re-queries public.recipes from inside itself. That
-- works for a plain SELECT, but when a statement does
-- INSERT INTO recipes ... RETURNING (as .insert().select() does), the
-- new row isn't visible yet to the function's own nested query against
-- the same table (per-command MVCC visibility), so the check always
-- fails with "new row violates row-level security policy for table
-- recipes" even for the owner. Inline the owner check directly against
-- the row instead of routing it through a query.
drop policy if exists "owner or shared user can view recipes" on public.recipes;
create policy "owner or shared user can view recipes" on public.recipes
  for select using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.recipe_shares s where s.recipe_id = recipes.id and s.user_id = auth.uid()
    )
  );
