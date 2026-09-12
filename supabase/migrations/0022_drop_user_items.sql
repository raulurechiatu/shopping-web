-- HOLD FOR REVIEW — not yet applied to the live database.
-- user_items is fully retired now that favorites and pantry both live on
-- household_items (row count confirmed 0, and no code path reads/writes
-- it as of the ShoppingListView/lists[id] fix in this same batch). This
-- migration is written and ready but deliberately not run yet since
-- dropping a table is irreversible — apply once you've given the go-ahead.
drop table if exists public.user_items;
