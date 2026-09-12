-- user_items was fully retired once favorites and pantry both moved onto
-- household_items (confirmed empty and unreferenced before this ran).
-- Applied to the live database on 2026-09-12.
drop table if exists public.user_items;
