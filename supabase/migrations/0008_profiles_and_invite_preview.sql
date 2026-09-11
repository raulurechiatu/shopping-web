-- Public profile mirror of auth.users. auth.users itself isn't queryable
-- from the client, but we need to show a list/recipe owner's name to
-- other members (e.g. "invited by Raul"), so keep a minimal public copy
-- in sync via a trigger.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are publicly readable" on public.profiles
  for select using (true);

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    now()
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_upserted on auth.users;
create trigger on_auth_user_upserted
  after insert or update of raw_user_meta_data on auth.users
  for each row execute function public.sync_profile_from_auth_user();

-- Backfill existing users.
insert into public.profiles (id, full_name, avatar_url, updated_at)
select
  id,
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'),
  coalesce(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture'),
  now()
from auth.users
on conflict (id) do nothing;

-- Preview a list invite (name + owner display name) without requiring
-- membership, so the join page can show who's inviting you before you
-- actually join.
create or replace function public.get_list_invite_preview(code text)
returns table (list_id uuid, list_name text, owner_name text, owner_avatar_url text)
language sql
security definer
stable
set search_path = public
as $$
  select l.id, l.name, p.full_name, p.avatar_url
  from public.lists l
  left join public.profiles p on p.id = l.owner_id
  where l.invite_code = code;
$$;

create or replace function public.get_recipe_invite_preview(code text)
returns table (recipe_id uuid, recipe_name text, recipe_kind text, owner_name text, owner_avatar_url text)
language sql
security definer
stable
set search_path = public
as $$
  select r.id, r.name, r.kind, p.full_name, p.avatar_url
  from public.recipes r
  left join public.profiles p on p.id = r.owner_id
  where r.invite_code = code;
$$;

-- Callable pre-auth: the join page shows who's inviting you before you
-- sign in or join as a guest.
grant execute on function public.get_list_invite_preview(text) to anon, authenticated;
grant execute on function public.get_recipe_invite_preview(text) to anon, authenticated;
