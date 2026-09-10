-- Fixes "infinite recursion detected in policy for relation list_members"
-- The list_members SELECT policy referenced list_members inside its own
-- USING clause. Route membership checks through a SECURITY DEFINER
-- function so they bypass RLS instead of re-triggering it.

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

drop policy if exists "members can view their lists" on public.lists;
create policy "members can view their lists" on public.lists
  for select using (public.is_list_member(id));

drop policy if exists "members can view membership" on public.list_members;
create policy "members can view membership" on public.list_members
  for select using (public.is_list_member(list_id));

drop policy if exists "members can view items" on public.list_items;
create policy "members can view items" on public.list_items
  for select using (public.is_list_member(list_id));

drop policy if exists "members can insert items" on public.list_items;
create policy "members can insert items" on public.list_items
  for insert with check (public.is_list_member(list_id));

drop policy if exists "members can update items" on public.list_items;
create policy "members can update items" on public.list_items
  for update using (public.is_list_member(list_id));

drop policy if exists "members can delete items" on public.list_items;
create policy "members can delete items" on public.list_items
  for delete using (public.is_list_member(list_id));
