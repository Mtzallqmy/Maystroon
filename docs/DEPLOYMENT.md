# Deployment

## Supabase

The owner explicitly retired the existing Fadhkur project and selected `ttvasynaxkkcwrmvlorg` for MAYSTROON. Its database is now migrated; dashboard name may still read Fadhkur. See SUPABASE_REPURPOSE_REPORT.md.

```sh
npx supabase login
npx supabase link --project-ref ttvasynaxkkcwrmvlorg
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

`supabase/config.toml` configures the optional local stack with no public signup, required email confirmation, no private schema exposure and no duplicate seed file. Hosted Auth settings must be configured separately in the selected project; db push does not apply Auth configuration.

## Current connection

The database project URL is in `.env.example` and `supabase/project.json`; keys are not committed. Local smoke checks used an ignored `.env.local` with the project's publishable key. Next.js service role, RATE_LIMIT_SECRET and PIN_PEPPER still require secure server environment configuration. Until then public database reads and pages work, but limited application API/auth actions fail closed. Health exposes database/API configuration separately and returns 503 unless both are ready.

Migration filenames match the six remote history versions. The first file is an audit ledger marker for a one-time teardown, deliberately a no-op for fresh installs; its actual reviewed destructive SQL is in operations and must never be run against the new platform. Subsequent migrations reproduce the new schema and policies. Supabase Edge function source uses Deno and is excluded from the Next.js TypeScript program.
