# Database

Two migrations: foundation and editorial Storage bucket. Created using Supabase CLI. Foundation can replay safely; seeds use conflict guards, policies/triggers are replaced, and existing owner closure is preserved. Apply ONLY to a dedicated/explicitly selected MAYSTROON database. Do not use unrelated existing projects.

## Relations

| Table           | Relations and access                                                          |
| --------------- | ----------------------------------------------------------------------------- |
| profiles        | Auth UUID; own profile read only                                              |
| roles           | OWNER/ADMIN/EDITOR/AUTHOR names; public read                                  |
| user_roles      | Auth UUID + role UUID composite key; own roles read; assignment operator-only |
| categories      | Unique slug; ordered/active/deleted flags                                     |
| authors         | Optional profile; unique slug; public fields                                  |
| posts           | Author FK; status/visibility; publication scheduling; soft deletion           |
| post_categories | Composite join key; public only when both targets are visible                 |
| post_revisions  | Post/editor FKs; staff-only read; future snapshots                            |
| media_assets    | Owner FK; constrained type and size; no client writes                         |
| comments        | Post/user FKs; moderation statuses; disabled publicly                         |
| post_views      | Post FK; daily dedup hash; no client access or increments                     |
| site_settings   | Explicit is_public flag; private values blocked                               |
| ticker_items    | Active publication window and safe URL; ordered                               |
| audit_logs      | Actor FK; no client writes; minimal action metadata                           |

Every public/private table has RLS. Public content reads require published/public/not-deleted and publication date at or before now. Staff can read editorial tables through a private function that checks `auth.uid()` and database roles; never user metadata. AUTHOR currently receives only own identity/public content. Editorial writes are intentionally disabled until narrow policies in Stage 2.

`private.owner_bootstrap` locks a singleton and closes permanently. `private.account_pins` stores only peppered salted scrypt outputs. `private.rate_limits` serializes attempts with an atomic upsert and expires old entries. Private schema must not be exposed in Data API. Only service_role can call PIN/rate RPCs; bootstrap is SQL operator-only and revoked from service_role as well.

Storage: public `editorial` bucket limited to 5 MiB JPEG/PNG/WebP/AVIF. No upload policies. Published covers only; drafts must use a private bucket in the future. Database MIME checks do not prove file contents; the future upload pipeline must inspect magic bytes/decode/re-encode images before publishing. No SVG upload.

PGlite tests execute real PostgreSQL RLS and migrations against Auth/Storage schema fixtures. They do not test a deployed Supabase Auth/PostgREST/Storage service. Remote advisors and live smoke tests remain required after project selection.
