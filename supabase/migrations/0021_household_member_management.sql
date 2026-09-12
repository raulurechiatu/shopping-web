-- Lets the household owner remove someone else (any member can already
-- leave on their own via the existing "members can leave a household"
-- delete policy — this adds the other direction).
create or replace function public.remove_household_member(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household_id uuid;
  caller_owner_id uuid;
begin
  select household_id into target_household_id
  from public.household_members
  where user_id = target_user_id;

  if target_household_id is null then
    raise exception 'That person is not in a household.';
  end if;

  select owner_id into caller_owner_id from public.households where id = target_household_id;

  if caller_owner_id is null or caller_owner_id <> auth.uid() then
    raise exception 'Only the household owner can remove members.';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Use leave instead of remove for yourself.';
  end if;

  delete from public.household_members
  where household_id = target_household_id and user_id = target_user_id;
end;
$$;
