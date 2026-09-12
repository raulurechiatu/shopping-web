-- Collapses "favorites" into the shared pantry list instead of a separate
-- personal list: household_items gets its own is_favorite flag, so the
-- Items screen becomes a single shared list with a star toggle per chip.

alter table public.household_items add column if not exists is_favorite boolean not null default false;

-- Backfill: anything still marked favorite on the old personal table
-- (pantry items were already migrated by merge_pantry_into_household)
-- moves into the owner's household now, then the source row is removed —
-- user_items no longer has a role once someone's in a household.
insert into public.household_items (household_id, name, category, quantity, added_by, is_favorite)
select hm.household_id, ui.name, ui.category, 1, ui.owner_id, true
from public.user_items ui
join public.household_members hm on hm.user_id = ui.owner_id
where ui.is_favorite = true
on conflict (household_id, lower(name)) do update set is_favorite = true;

delete from public.user_items ui
where ui.is_favorite = true
  and exists (select 1 from public.household_members hm where hm.user_id = ui.owner_id);

-- Going forward, joining/creating a household merges *all* remaining
-- personal items (not just pantry-flagged ones) — there's no more
-- personal/shared split once you're in a household.
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
    select * from public.user_items where owner_id = auth.uid()
  loop
    insert into public.household_items (household_id, name, category, quantity, added_by, is_favorite)
    values (target_household_id, item.name, item.category, 1, auth.uid(), item.is_favorite)
    on conflict (household_id, lower(name)) do update set is_favorite = excluded.is_favorite or public.household_items.is_favorite;

    delete from public.user_items where id = item.id;
  end loop;
end;
$$;

create or replace function public.get_household_invite_preview(code text)
returns table(household_id uuid, household_name text, owner_name text, owner_avatar_url text)
language sql
stable security definer
set search_path = public
as $$
  select h.id, h.name, p.full_name, p.avatar_url
  from public.households h
  left join public.profiles p on p.id = h.owner_id
  where h.invite_code = code;
$$;
