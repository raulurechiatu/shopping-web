-- Lets a hand-typed recipe carry a photo too, matching imported recipes
-- (which already show a thumbnail from TheMealDB/TheCocktailDB). Entirely
-- optional — null just means no image, same as today.
alter table public.recipes add column if not exists image_url text;
