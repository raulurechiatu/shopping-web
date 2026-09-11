-- Cocktails reuse the recipes table/logic entirely (ingredients,
-- instructions, sharing, add-to-list) — they're just a different
-- "kind" of recipe, filtered into separate list views in the app.
alter table public.recipes add column if not exists kind text not null default 'food';

alter table public.recipes drop constraint if exists recipes_kind_check;
alter table public.recipes add constraint recipes_kind_check check (kind in ('food', 'cocktail'));
