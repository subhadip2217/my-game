-- Private Camera Room photo storage.
-- The 128-bit room token in the invitation link is the access capability.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('room-photos', 'room-photos', false, 10485760, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['image/jpeg'];

drop policy if exists "Room participants can read room photos" on storage.objects;
create policy "Room participants can read room photos"
on storage.objects for select to anon
using (bucket_id = 'room-photos' and (storage.foldername(name))[1] ~ '^[a-f0-9]{32}$');

drop policy if exists "Room participants can upload room photos" on storage.objects;
create policy "Room participants can upload room photos"
on storage.objects for insert to anon
with check (bucket_id = 'room-photos' and (storage.foldername(name))[1] ~ '^[a-f0-9]{32}$' and name = (storage.foldername(name))[1] || '/last-photo.jpg');

drop policy if exists "Room participants can update room photos" on storage.objects;
create policy "Room participants can update room photos"
on storage.objects for update to anon
using (bucket_id = 'room-photos' and (storage.foldername(name))[1] ~ '^[a-f0-9]{32}$' and name = (storage.foldername(name))[1] || '/last-photo.jpg')
with check (bucket_id = 'room-photos' and (storage.foldername(name))[1] ~ '^[a-f0-9]{32}$' and name = (storage.foldername(name))[1] || '/last-photo.jpg');
