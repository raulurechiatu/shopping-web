-- "Have at home" — a second, independent tag on the item catalog (besides
-- is_favorite) so pantry-based recipe search can be based on what's
-- actually in the house instead of guessing from whatever's on a list.
alter table public.list_item_catalog add column if not exists is_pantry boolean not null default false;
