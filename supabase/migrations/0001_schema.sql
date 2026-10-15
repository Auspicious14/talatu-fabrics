-- Talatu Fabrics: core schema
-- Money is stored as integer KOBO (1 NGN = 100 kobo) in bigint columns.
-- Unknown values are NULL. Nothing is defaulted to a fabricated price or stock.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums
do $$ begin
  create type publication_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  -- 'unconfirmed' is the default for anything imported from history:
  -- an image is not proof of stock.
  create type availability_status as enum ('available', 'made_to_order', 'sold_out', 'unconfirmed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pricing_unit as enum ('yard', 'set', 'piece', 'bundle', 'roll');
exception when duplicate_object then null; end $$;

do $$ begin
  create type variant_kind as enum ('colour', 'size', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type retrieval_status as enum
    ('pending', 'imported', 'preview_only', 'duplicate', 'unavailable', 'failed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- helpers
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- admins
-- Single-owner friendly: a tiny allow-list keyed by auth user id.
-- There is intentionally NO insert/update/delete policy for any client role,
-- so nobody can grant themselves admin through the API. Admins are created
-- only via SQL editor / service role (see README).
create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_users where user_id = auth.uid());
$$;

revoke all on function is_admin() from public;
grant execute on function is_admin() to anon, authenticated;

-- ---------------------------------------------------------------- categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  sort_order integer not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger categories_updated before update on categories
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------- import batches
create table if not exists import_batches (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('upload', 'zip', 'instagram_public')),
  label text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'closed')),
  summary jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger import_batches_updated before update on import_batches
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------- products
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  sku text unique check (sku is null or char_length(sku) between 1 and 64),
  slug text unique check (slug is null or slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text check (name is null or char_length(name) between 1 and 160),
  category_id uuid references categories(id) on delete set null,
  short_description text check (short_description is null or char_length(short_description) <= 280),
  description text check (description is null or char_length(description) <= 8000),

  price_kobo bigint check (price_kobo is null or price_kobo >= 0),
  pricing_unit pricing_unit,
  min_order_qty numeric(8,2) check (min_order_qty is null or min_order_qty > 0),
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),

  availability availability_status not null default 'unconfirmed',
  publication_status publication_status not null default 'draft',
  featured boolean not null default false,

  instagram_url text check (instagram_url is null or instagram_url ~ '^https://(www\.)?instagram\.com/'),
  source_caption text,          -- original caption, preserved verbatim for review
  internal_notes text,
  needs_review boolean not null default false,
  import_batch_id uuid references import_batches(id) on delete set null,

  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Do not allow publishing something that cannot be shown properly.
  constraint published_requires_name_and_slug check (
    publication_status <> 'published' or (name is not null and slug is not null)
  ),
  -- Archived items are never featured and never "available".
  constraint archived_not_featured check (publication_status <> 'archived' or featured = false)
);
create index if not exists products_pub_idx on products (publication_status, created_at desc);
create index if not exists products_category_idx on products (category_id);
create index if not exists products_featured_idx on products (featured) where featured;
create index if not exists products_search_idx on products
  using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(sku,'') || ' ' || coalesce(short_description,'') || ' ' || coalesce(description,'')));
create trigger products_updated before update on products
  for each row execute function set_updated_at();

create or replace function products_status_stamps() returns trigger
language plpgsql as $$
begin
  if new.publication_status = 'published' and (tg_op = 'INSERT' or old.publication_status is distinct from 'published') then
    new.published_at = coalesce(new.published_at, now());
  end if;
  if new.publication_status = 'archived' then
    new.archived_at = coalesce(new.archived_at, now());
    new.featured = false;
  else
    new.archived_at = null;
  end if;
  return new;
end $$;
create trigger products_stamps before insert or update on products
  for each row execute function products_status_stamps();

-- ---------------------------------------------------------------- images
create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  storage_path text not null unique,       -- path inside the product-images bucket
  content_hash text not null,              -- sha256 of original bytes
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  alt_text text check (alt_text is null or char_length(alt_text) <= 300),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
-- One physical image is stored once: makes retries/duplicate imports safe.
create unique index if not exists product_images_hash_uidx on product_images (content_hash);
create index if not exists product_images_product_idx on product_images (product_id, sort_order);

-- ---------------------------------------------------------------- variants
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  kind variant_kind not null default 'colour',
  label text not null check (char_length(label) between 1 and 80),
  price_kobo bigint check (price_kobo is null or price_kobo >= 0), -- optional override
  availability availability_status,                                  -- optional override
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, kind, label)
);
create index if not exists product_variants_product_idx on product_variants (product_id, sort_order);

-- ---------------------------------------------------------------- import items
create table if not exists import_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references import_batches(id) on delete cascade,
  filename text,
  content_hash text,
  storage_path text,
  source_url text,                 -- original public post URL (kept as reference)
  caption text,
  posted_at timestamptz,
  suggested_name text,
  retrieval retrieval_status not null default 'pending',
  error text,
  product_id uuid references products(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists import_items_batch_idx on import_items (batch_id, created_at);
-- Re-submitting the same post URL never creates a second item.
create unique index if not exists import_items_source_uidx on import_items (source_url) where source_url is not null;

-- ---------------------------------------------------------------- settings
create table if not exists site_settings (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  value jsonb,                      -- NULL / JSON null = not set by the owner yet
  is_public boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger site_settings_updated before update on site_settings
  for each row execute function set_updated_at();

-- Seed ONLY neutral, unconfirmed placeholders. Nothing here asserts a business fact.
insert into site_settings (key, value, is_public) values
  ('business_name',        '"Talatu Fabrics"',        true),
  ('whatsapp_number',      'null',                    true),   -- digits, international format, set by owner
  ('instagram_url',        '"https://www.instagram.com/talatufabrics/"', true),
  ('contact_email',        'null',                    true),
  ('contact_phone',        'null',                    true),
  ('business_address',     'null',                    true),
  ('announcement_text',    'null',                    true),
  ('announcement_enabled', 'false',                   true),
  ('about_text',           'null',                    true),
  ('delivery_text',        'null',                    true),
  ('returns_text',         'null',                    true),
  ('hero_headline',        'null',                    true),
  ('hero_subtext',         'null',                    true)
on conflict (key) do nothing;
