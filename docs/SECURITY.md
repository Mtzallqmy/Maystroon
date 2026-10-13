# Security

## Identity and owner

1. In the selected Supabase project's trusted dashboard, create/invite mtzallqmy@gmail.com with email confirmation enabled and normal password authentication. User must complete the provider's verification. Configure SMTP/allowed redirects and `/auth/callback` as needed; confirmation URL handling depends on the chosen invitation/confirmation template.
2. A trusted operator independently verifies that the confirmed UUID belongs to the intended owner. Email match is a guard, never an automatic role assignment.
3. In SQL Editor, run `select private.bootstrap_owner('VERIFIED_UUID'::uuid);`. No web bootstrap endpoint exists. Function is inaccessible to anon/authenticated/service_role, locks state, checks confirmation and expected email, assigns OWNER and closes. An explicit database operator remains the trust boundary.
4. Login `/admin/login`, then set a 6–12 digit PIN in `/admin/account` with current password reauthentication. There is no default PIN. PIN is a secondary secret foundation; it is not enabled as standalone login or claimed to be MFA.

Admin layouts validate `auth.getUser()` remotely, confirmed email, and actual database roles. Every action validates independently. Account/email-only matching and user_metadata authorization are forbidden. No signup or role-management public endpoints.

PIN uses HMAC-SHA256 with an independent server pepper, then scrypt N=32768,r=8,p=1, random 16-byte salt and constant-time verifier. Shared account limiter allows 5 setup attempts per 15 minutes. Login limiter allows 5 requests per trusted connection per 15 minutes, in addition to provider Auth throttles. There is no PIN verification endpoint yet; add shared account attempt limits before enabling one.

Public API uses 60 requests/minute and service-only transactional limiter. Requires RATE_LIMIT_SECRET and service_role server configuration; fails closed on limiter failure. Vercel overwrites `x-vercel-forwarded-for` at the trusted edge; direct/untrusted deployments collapse to a common local bucket and need equivalent trusted ingress. Do not trust caller-supplied forwarded headers on a different host. Public Supabase direct reads remain protected by RLS but do not share the application API limiter.

Mutations check exact Origin against NEXT_PUBLIC_SITE_URL. Auth cookies are refreshed in proxy and private/no-store. Static CSP is not applied blindly: a future nonce CSP must support Next.js hydration. Security headers include nosniff, DENY framing, strict referrer and restricted permissions.

No public writes in Stage 1. post_views has no direct public write/read and no counting endpoint, so view metrics and most-read sections are not shown. Content HTML is never injected; JSON-LD escapes `<`. Cover optimization accepts only selected Supabase editorial paths. Secrets remain server-only, logs do not contain passwords/PINs, no tokens are committed.

Before production: remote migration/advisors, SMTP and confirmed owner verification, HTTPS canonical URL, privileged RPC checks, dependency review, backup policy and provider log retention settings.
