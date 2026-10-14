# API v1

Machine-readable OpenAPI 3.1: `public/openapi.json` served as `/openapi.json`. JSON success `{data:...}`; posts additionally return total/page/pageSize/filter/sort. Errors `{error:{code}}`. No HTML/WebView dependency.

| Method | Path                  | Purpose                                                                                          |
| ------ | --------------------- | ------------------------------------------------------------------------------------------------ |
| GET    | /api/v1/health        | Database/API configuration state; 503 unless database and shared limiter configuration are ready |
| GET    | /api/v1/categories    | Active public ordered categories                                                                 |
| GET    | /api/v1/posts         | Published public post collection                                                                 |
| GET    | /api/v1/posts/{slug}  | Published public article or 404                                                                  |
| GET    | /api/v1/authors       | Public authors, paginated                                                                        |
| GET    | /api/v1/site/settings | Explicitly public settings only                                                                  |

Posts query: page 1..10000, pageSize 1..50, category slug, q title query max 100 characters, sort newest/oldest. Authors accept page/pageSize. Invalid supported values return 400 INVALID_QUERY. Public content repository and RLS BOTH exclude drafts/private/deleted/future items. APIs use an anonymous client, never the signed-in admin session. 429 RATE_LIMITED; 503 DATABASE_NOT_CONFIGURED/SERVICE_UNAVAILABLE; 404 NOT_FOUND. Error messages and admin settings are not leaked.

Article body is plain text in Stage 1. Android consumers should treat content as text. CORS is not required for native Android. Browser third-party integrations need a deliberate future CORS policy.

No analytics increment, comment, upload, editorial mutation or public bootstrap endpoints are enabled.

## Stage 2 additions (v1.1, existing v1 paths retained)

GET /search uses the same validated query contract as /posts: q, category, author, page, pageSize and chronological sort. Content search uses the normalized PostgreSQL full-text index. GET /categories/{slug}/posts and /authors/{slug} expose public catalog data. GET /trending returns daily aggregate view counts for published posts only (days 1–30, limit 1–50).

GET /posts/{id}/comments returns approved comments, total, page and pageSize=30. Here id is a post UUID, while the existing GET /posts/{slug} uses its public slug. POST comments accepts name, optional email, body, optional parent_id and an empty honeypot website. New comments return pending and await moderation. POST /posts/{id}/views returns counted under the documented daily deduplication policy. POST /comments/{id}/reports accepts a reason.

Administration uses verified Supabase SSR session cookies. POST /admin/{resource} accepts explicit commands; resources are posts, transitions, revisions, categories, category-transfer, authors, ticker, media, comments, bulk and publishing. Post saves require title/slug plus editable patch fields; version is required for existing posts. Transitions use publish, unpublished, scheduled, archived, draft, review, delete, restore, duplicate. Scheduled timestamps are ISO UTC. Comment actions are approved, rejected, hidden, delete. Identity/status/counters cannot be mass-assigned in a save patch. Bulk items are id/version pairs, maximum 50, and the transaction is atomic.

GET /admin/data has a resource allowlist, page (100 rows), optional post UUID for revisions, and post q/status filters. Revision lists contain only identifiers/timestamps, not raw snapshots. Media upload is multipart file; crop accepts source_id, rotation, left/top/width/height and output dimensions. Gated image byte endpoints use variant original/optimized/thumbnail/social. Preview uses bounded RichDocument JSON and the public allowlist renderer. The browser session is independently checked in every route/service and again in SQL writes.

Mutation requests require Origin matching NEXT_PUBLIC_SITE_URL. Native callers for anonymous write routes send this configured Origin; reads need no browser or WebView. Server-wide rate limits use PostgreSQL, with 60/minute default public reads, 5/minute comments, 10/minute reports, 60/minute views and 20/minute authenticated uploads. Limits fail closed if server secrets are missing. Error shape remains {error:{code}}. Stale post version ->409 VERSION_CONFLICT; unauthenticated ->401; forbidden/origin ->403; missing publication ->404; unavailable service ->503.

GET /cron/publish is an optional server-only Bearer CRON_SECRET fallback; Supabase pg_cron is primary. Full paths and request shapes are in public/openapi.json. Administration is currently web cookie-based; a future Android authenticated administration flow would need a documented token contract.

category-transfer accepts id (source) and transfer_to (target), requires publisher privileges, records revisions/versions and preserves the source association as secondary. Sharing preferences allow facebook/x/telegram/whatsapp/webshare/copy booleans and control public share buttons.
