-- Regression fix: 0022 dropped public.user_items, but
-- merge_pantry_into_household (called by both create_household and
-- join_household_by_code) still selected from it — every create/join
-- attempt since then has failed with "relation user_items does not
-- exist". There's nothing left to merge (user_items' data was folded
-- into household_items before it was dropped), so the merge step is
-- simply removed rather than replaced.
create or replace function public.create_household(household_name text default 'Our household')
returns public.households
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
  return new_household;
end;
$$;

create or replace function public.join_household_by_code(code text)
returns public.households
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
  return target_household;
end;
$$;

drop function if exists public.merge_pantry_into_household(uuid);
