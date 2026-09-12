-- One-tap "share this list with my household" — adds every household
-- member as a list member directly, no invite-code/approval step, since
-- household members are already a trusted group.
create or replace function public.share_list_with_household(target_list_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_household_id uuid;
begin
  if not public.is_list_member(target_list_id) then
    raise exception 'You are not a member of this list.';
  end if;

  select household_id into my_household_id from public.household_members where user_id = auth.uid();
  if my_household_id is null then
    raise exception 'Set up a household in Account first.';
  end if;

  insert into public.list_members (list_id, user_id)
  select target_list_id, hm.user_id
  from public.household_members hm
  where hm.household_id = my_household_id
  on conflict do nothing;
end;
$$;
