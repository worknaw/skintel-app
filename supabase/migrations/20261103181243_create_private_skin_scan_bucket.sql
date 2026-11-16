-- Private bucket foundation. No end-user policies are granted until consent and upload flows exist.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('skin-scan-images', 'skin-scan-images', false, 10485760, array['image/jpeg', 'image/png']);
