-- Recipes are personal (owned by one user), not shared via list_members.
-- Their ingredients can be added to any shopping list the owner belongs to.

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  name text not null,
  quantity text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;

create policy "owner can view their recipes" on public.recipes
  for select using (owner_id = auth.uid());

create policy "owner can insert their recipes" on public.recipes
  for insert with check (owner_id = auth.uid());

create policy "owner can update their recipes" on public.recipes
  for update using (owner_id = auth.uid());

create policy "owner can delete their recipes" on public.recipes
  for delete using (owner_id = auth.uid());

-- recipe_ingredients policies join back to recipes (a different table, so
-- no self-referencing recursion risk like list_members had).
create policy "owner can view recipe ingredients" on public.recipe_ingredients
  for select using (
    exists (select 1 from public.recipes r where r.id = recipe_ingredients.recipe_id and r.owner_id = auth.uid())
  );

create policy "owner can insert recipe ingredients" on public.recipe_ingredients
  for insert with check (
    exists (select 1 from public.recipes r where r.id = recipe_ingredients.recipe_id and r.owner_id = auth.uid())
  );

create policy "owner can update recipe ingredients" on public.recipe_ingredients
  for update using (
    exists (select 1 from public.recipes r where r.id = recipe_ingredients.recipe_id and r.owner_id = auth.uid())
  );

create policy "owner can delete recipe ingredients" on public.recipe_ingredients
  for delete using (
    exists (select 1 from public.recipes r where r.id = recipe_ingredients.recipe_id and r.owner_id = auth.uid())
  );
