-- Realtime DELETE events only include the primary key in the "old" row
-- unless a table's replica identity is FULL. Our list_items/list_item_catalog
-- subscriptions filter on list_id (`filter: list_id=eq.<id>`), which isn't
-- present in a PK-only old row, so postgres_changes silently drops every
-- DELETE broadcast that doesn't match — meaning another member's delete
-- never live-updated anyone else's view. Each user's own delete already
-- worked locally via optimistic UI, which is exactly why this went unnoticed.
alter table public.list_items replica identity full;
alter table public.list_item_catalog replica identity full;
