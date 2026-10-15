-- Duplicate detection support for the import tooling.
--  * source_hash: sha256 of the ORIGINAL file the browser read. Re-submitting the same
--    file (a retry) returns the existing item instead of creating another one.
--  * phash: 64-bit difference hash (hex) of the processed image, to flag near-duplicates
--    (same photo re-saved / resized) for human review. Near-duplicates are flagged, not dropped.

alter table import_items   add column if not exists source_hash text;
alter table import_items   add column if not exists phash text;
alter table product_images add column if not exists phash text;

create unique index if not exists import_items_source_hash_uidx on import_items (source_hash) where source_hash is not null;
create index if not exists product_images_phash_idx on product_images (phash) where phash is not null;
