# Talatu Fabrics storefront

Premium fabric boutique for Talatu Fabrics. Next.js (App Router) · TypeScript (strict) · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage). Orders are **WhatsApp enquiries**: no payment gateway, no customer accounts.

Built as a surprise gift. It starts as a **private, password-protected preview**; every historical product is a **draft** until the owner reviews it.

> Read `docs/TEST_REPORT.md` for exactly what has and has not been verified.

## 1. Local setup

```bash
npm install
cp .env.example .env.local      # fill in the values (see below)
npm run dev                     # http://localhost:3000
npm run typecheck && npm run lint && npm test && npm run build
```

Without Supabase variables the site still builds and shows honest empty states ("collection is being prepared"); admin cannot sign in.

## 2. Supabase setup

1. Create a project at supabase.com (the free tier is enough to start).
2. SQL editor: run, in order, `supabase/migrations/0001_schema.sql`, `0002_rls_and_storage.sql`, `0003_import_dedupe.sql`.
3. Copy **Project URL** and **anon key** into `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Authentication → Providers → Email: keep enabled; **disable "Allow new users to sign up"** so only invited users exist.
5. Storage: the `product-images` bucket (public read, admin-only write, 8 MB, images only) is created by migration 0002.

Security model: RLS is on for every table. The public (anon) role can only read *published* products, their images/variants, public categories and public settings. Writes need a row in `admin_users`, which no API role can insert into (no role escalation). The browser only ever holds the anon key. **There is no service-role key in this app at all.** Admin actions and imports run as the signed-in admin and are limited by RLS.

## 3. Create the first administrator (securely)

1. Supabase → Authentication → Users → **Add user** → enter the owner's email and a strong temporary password (tick auto-confirm).
2. SQL editor, once:
   ```sql
   insert into admin_users (user_id)
   select id from auth.users where email = 'owner@example.com';
   ```
3. Owner signs in at `/admin/login` and changes the password (Authentication → Users → send password recovery).

## 4. Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase connection (public by design; protected by RLS) |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for sitemap, canonical links, WhatsApp product links |
| `PREVIEW_MODE` | `true` (default) = password gate + noindex. Set `false` to go live |
| `PREVIEW_PASSWORD` | Required while preview is on. If missing, the site returns 503 rather than opening up |
| `DISCOVERY_PROVIDER`, `META_OEMBED_TOKEN`, `DISCOVERY_ALLOW_DOWNLOAD` | Optional Instagram discovery (section 6). Server-only |

## 5. Deploy to Vercel

1. Push to GitHub, import the repo in Vercel.
2. Add the environment variables above (keep `PREVIEW_MODE=true` and set a `PREVIEW_PASSWORD`). Share the preview URL + password only with the gift recipient.
3. **To go live** (after the owner approves): set `PREVIEW_MODE=false`, set `NEXT_PUBLIC_SITE_URL` to the real domain, redeploy. Robots/sitemap switch on automatically.

Costs: Vercel Hobby and Supabase Free cover a small catalogue. Note Vercel Hobby is non-commercial; a live business site should use Vercel Pro (see vercel.com/pricing). Supabase free projects pause after inactivity; Pro avoids that. No other paid dependency is required.

## 6. Importing the historical catalogue

Everything imports as a **draft flagged "needs review"**. No price, stock or availability is ever inferred from an image or caption.

**Preferred sources (in order)**
1. The owner's Instagram data export (Accounts Centre → Your information and permissions → Download your information → Posts/media, JSON or HTML). Unzip/zip the media folder.
2. Her original photos.
3. Admin → **Import**: drop a ZIP or multiple images (JPG/PNG/WebP/AVIF, 8 MB each; ZIP ≤ 300 MB; up to 1,000 images per batch), optionally with a CSV (`public/talatu-import-template.csv`).
   - CSV `filename` may list several files separated by `|` to make one product with multiple photos.
   - Review thumbnails, suggested names, skipped files and unmatched CSV rows **before** importing.
   - Retrying is safe: duplicates are caught by file hash, processed-image hash, and a perceptual hash (near-duplicates are flagged in the product's private notes).
4. Then Admin → Products → filter **Needs review**; use bulk actions to set category/availability, fix details, and publish. Publishing requires a name, a photo and the review flag cleared.

**Public Instagram post links (optional, separate utility)**: Admin → Import → "Public Instagram post links". Paste post URLs; each becomes a reference-only draft that keeps the post link. This tool:
- does not log in, scrape the profile, or discover posts by itself, and never claims to have found all posts;
- with `DISCOVERY_PROVIDER=none` (default) only records the links;
- with `meta_oembed` uses Meta's official oEmbed API (needs a Meta developer app and token; **untested here**, and Meta may only return a thumbnail and caption for some posts);
- never copies images unless `DISCOVERY_ALLOW_DOWNLOAD=true`, which you should set only with the owner's permission. Otherwise the post link remains the reference, and no temporary Instagram image URL is used as a product asset (the storefront image config does not even allow Instagram hosts).

The storefront never calls any of this and does not depend on it.

## 7. Admin features

Products (add/edit/preview/publish/unpublish/archive, photo upload + ordering + alt text, variants, bulk category/availability/status, search/filter, CSV export), Categories, Site settings (WhatsApp number, contact, announcement bar, About/Delivery/Returns text), Import. Mobile-friendly.

Archiving is reversible (status `archived`; history kept). Stock quantity is private and never shown publicly.

## 8. Notes

- Money is stored as integer **kobo** (`price_kobo bigint`); `NULL` price shows "Enquire for price".
- Publication status (`draft/published/archived`) is separate from availability (`available/made_to_order/sold_out/unconfirmed`).
- Product images are re-encoded to WebP, auto-rotated, metadata (e.g. GPS) stripped, max 2400 px. Colours are not altered.
- Draft images live in a public-read bucket under random UUID paths: unguessable but not cryptographically private.

See `docs/OWNER_CHECKLIST.md` for what the owner still needs to provide.
