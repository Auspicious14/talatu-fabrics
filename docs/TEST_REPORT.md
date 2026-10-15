# Test report (what was actually verified)

Date: 2026-10-15. Environment: Node 22, no Supabase project, no network access to Instagram.

## Verified
| Check | Result |
|---|---|
| `tsc --noEmit` (strict) | Pass |
| `eslint .` (incl. React Compiler rules) | Pass, 0 problems |
| `vitest` | 17 tests pass: kobo/naira parsing & formatting, WhatsApp number normalisation, URL encoding & message content, CSV parsing/matching, filename/caption name suggestions, Instagram URL normalisation/dedupe, media-host SSRF allow-list, perceptual-hash distance |
| `next build` (production) | Pass |
| Running production server, no Supabase configured | Preview gate: 401 without/with wrong password, 200 with right one; `X-Robots-Tag: noindex`; `robots.txt` disallows all; unknown product returns real 404; `/admin` redirects to login; admin import API returns 401; CSV export redirects; homepage/shop show honest empty states, no fake products |

## NOT verified (needs a real Supabase project)
- The SQL migrations were **not executed** against a database. Review them or run them in a fresh Supabase project and report any errors.
- RLS policies, storage policies and admin sign-in were not exercised end-to-end.
- Product create/edit/publish/archive, image upload & reordering, bulk actions, ZIP/CSV import with real images, duplicate detection against real data, and catalogue filtering/search against real rows were **not run**.
- Visual QA in a browser at phone/tablet/desktop widths was not performed; layout is built mobile-first but unseen.
- Meta oEmbed integration is untested (no credentials). Public Instagram access via normal fetch is blocked by the site's robots rules, so **no posts, images or captions were retrieved from @talatufabrics**, and nothing about her actual catalogue is known to this build.
- Accessibility was designed for (labels, focus states, reduced motion, skip link) but not audited with a screen reader or axe.
- Vercel deployment not performed.
