# Deployment

## Supabase

Select a dedicated MAYSTROON project before applying migrations. Available connected projects did not identify this platform; none were changed.

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Never commit credentials. Use current CLI `--help`. After applying, run database advisors and verify RLS using anon/authenticated identities, then GET health/categories/posts with an empty database. Six categories and four role names are seeds; no articles/authors are invented.

## Environment

| Variable                             | Scope / purpose                                                     |
| ------------------------------------ | ------------------------------------------------------------------- |
| NEXT_PUBLIC_SUPABASE_URL             | Selected project URL                                                |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Public key; ANON_KEY compatibility accepted                         |
| SUPABASE_SERVICE_ROLE_KEY            | Server only; limited-use PIN and shared limiter RPCs                |
| NEXT_PUBLIC_SITE_URL                 | Exact canonical HTTPS origin; localhost only for development        |
| PIN_PEPPER                           | Server only; independent random secret, at least 32 characters      |
| RATE_LIMIT_SECRET                    | Server only; independent random HMAC secret, at least 32 characters |

Generate the last two separately using `openssl rand -hex 32`; store only in Vercel environment settings. Changing PIN_PEPPER requires users to reset existing PINs. Preview environments need their own canonical URL and should use a dedicated development database.

## Vercel

Import `Mtzallqmy/Maystroon`, Next.js preset, Node 24, default build `npm run build`, install `npm ci`, root `/`. Preview branch `stage-1-foundation`; production branch main. No production merge/deploy until checks and live database verification pass. A failed/unconfigured `/api/v1/health` is 503, never false-green.

No connected Vercel tool/credentials were available at implementation, so no remote deployment is claimed. BotKeep is not needed for Stage 1.

After deployment verify direct routes, API, mobile/desktop, empty states, session refresh/logout, verified owner authorization, authenticated reads, no drafts via public API and correct canonical sitemap/metadata. Owner bootstrap and email confirmation require real identity participation.
