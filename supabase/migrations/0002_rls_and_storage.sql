-- Row Level Security + Storage policies.

alter table admin_users      enable row level security;
alter table categories       enable row level security;
alter table products         enable row level security;
alter table product_images   enable row level security;
alter table product_variants enable row level security;
alter table import_batches   enable row level security;
alter table import_items     enable row level security;
alter table site_settings    enable row level security;

-- admin_users: a signed-in user may only see their own row. No write policies at all,
-- which blocks role escalation through the API.
create policy admin_users_self_read on admin_users
  for select to authenticated using (user_id = auth.uid());

-- categories
create policy categories_public_read on categories
  for select to anon, authenticated using (is_public or is_admin());
create policy categories_admin_write on categories
  for all to authenticated using (is_admin()) with check (is_admin());

-- products: the public sees published products only.
create policy products_public_read on products
  for select to anon, authenticated
  using (publication_status = 'published' or is_admin());
create policy products_admin_write on products
  for all to authenticated using (is_admin()) with check (is_admin());

-- product_images / variants: visible only when the parent product is published.
create policy product_images_public_read on product_images
  for select to anon, authenticated
  using (is_admin() or exists (
    select 1 from products p where p.id = product_id and p.publication_status = 'published'));
create policy product_images_admin_write on product_images
  for all to authenticated using (is_admin()) with check (is_admin());

create policy product_variants_public_read on product_variants
  for select to anon, authenticated
  using (is_admin() or exists (
    select 1 from products p where p.id = product_id and p.publication_status = 'published'));
create policy product_variants_admin_write on product_variants
  for all to authenticated using (is_admin()) with check (is_admin());

-- import tooling is admin-only (no public access of any kind)
create policy import_batches_admin on import_batches
  for all to authenticated using (is_admin()) with check (is_admin());
create policy import_items_admin on import_items
  for all to authenticated using (is_admin()) with check (is_admin());

-- site_settings: public rows readable by everyone, writes admin-only.
create policy site_settings_public_read on site_settings
  for select to anon, authenticated using (is_public or is_admin());
create policy site_settings_admin_write on site_settings
  for all to authenticated using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------- storage
-- Public-read bucket (images are served through next/image). Object names are
-- random UUID paths, so unpublished (draft) images are not guessable, but they are
-- not cryptographically private. Only admins can write. 8 MB cap, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 8388608,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy product_images_storage_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and is_admin());
create policy product_images_storage_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and is_admin())
  with check (bucket_id = 'product-images' and is_admin());
create policy product_images_storage_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and is_admin());
-- Reads of a public bucket's objects do not need a policy (served via the public URL).
