-- Storage for recipe photos uploaded from a phone (camera or gallery),
-- alongside the existing "paste a link" option. Public read (recipe photos
-- are shown to anyone with view access to the recipe, same as an external
-- thumbnail URL would be); writes are restricted to the uploader's own
-- folder, named by their user id, mirroring the common Supabase Storage
-- per-user-folder RLS pattern.
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do nothing;

create policy "recipe images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'recipe-images');

create policy "users can upload their own recipe images"
  on storage.objects for insert
  with check (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can replace their own recipe images"
  on storage.objects for update
  using (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own recipe images"
  on storage.objects for delete
  using (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = auth.uid()::text);
