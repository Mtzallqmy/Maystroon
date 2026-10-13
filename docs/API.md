# API v1

Machine-readable OpenAPI 3.1: `public/openapi.json` served as `/openapi.json`. JSON success `{data:...}`; posts additionally return total/page/pageSize/filter/sort. Errors `{error:{code}}`. No HTML/WebView dependency.

| Method | Path                  | Purpose                                    |
| ------ | --------------------- | ------------------------------------------ |
| GET    | /api/v1/health        | Service/database state; 503 when not ready |
| GET    | /api/v1/categories    | Active public ordered categories           |
| GET    | /api/v1/posts         | Published public post collection           |
| GET    | /api/v1/posts/{slug}  | Published public article or 404            |
| GET    | /api/v1/authors       | Public authors, paginated                  |
| GET    | /api/v1/site/settings | Explicitly public settings only            |

Posts query: page 1..10000, pageSize 1..50, category slug, q title query max 100 characters, sort newest/oldest. Authors accept page/pageSize. Invalid supported values return 400 INVALID_QUERY. Public content repository and RLS BOTH exclude drafts/private/deleted/future items. APIs use an anonymous client, never the signed-in admin session. 429 RATE_LIMITED; 503 DATABASE_NOT_CONFIGURED/SERVICE_UNAVAILABLE; 404 NOT_FOUND. Error messages and admin settings are not leaked.

Article body is plain text in Stage 1. Android consumers should treat content as text. CORS is not required for native Android. Browser third-party integrations need a deliberate future CORS policy.

No analytics increment, comment, upload, editorial mutation or public bootstrap endpoints are enabled.
