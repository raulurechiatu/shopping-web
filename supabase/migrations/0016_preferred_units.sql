-- Lets a signed-in user set a preferred unit system (metric/imperial) on
-- their profile, used to auto-convert recipe ingredient quantities for
-- display. No update policy existed on profiles before this — it was only
-- ever written by the sync_profile_from_auth_user() trigger — so add one
-- scoped to the owner.
alter table public.profiles add column if not exists preferred_units text
  check (preferred_units in ('metric', 'imperial'));

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
