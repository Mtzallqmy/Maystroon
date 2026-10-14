# ما يسطرون | MAYSTROON

منصة تحريرية عربية RTL — معتز العلقمي، اليمن، تعز، 2026.

## التشغيل

```sh
npm ci
cp .env.example .env.local
npm run dev
```

بدون متغيرات Supabase تُعرض حالة تأسيس صريحة، وتُغلق الإدارة وAPI البيانات. لا يوجد محتوى تجريبي أو مالك افتراضي.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

راجع [تقرير المرحلة](docs/STAGE_1_REPORT.md)، [النشر](docs/DEPLOYMENT.md)، [الأمان](docs/SECURITY.md)، [قاعدة البيانات](docs/DATABASE.md)، [API](docs/API.md).

المرحلة الأولى لا تشمل محرراً متقدماً أو CRUD إدارة أو دمج BotKeep أو Android. لا تُعد جاهزة للإنتاج قبل الربط الخارجي والتحقق من هوية المالك.

## Stage 2 CMS

The stage-2-advanced-cms branch adds the Arabic Tiptap studio, transactional publishing/revisions/scheduling, private media/crop/static templates, authors/categories, moderated comments, daily view aggregates and Arabic full-text search. See docs/STAGE_2_BASELINE_AUDIT.md and docs/STAGE_2_REPORT.md for verified status and external blockers. This branch does not imply owner/bootstrap or Vercel activation is complete.

Run `npm run test:cms` for desktop/mobile integration workflows. It launches a local Supabase protocol fixture (simulated Auth/Storage, actual PostgreSQL migrations/RLS/RPC); no production fixture switch or test user is added to the application. The existing `npm run test:e2e` checks empty/unconfigured public pages. `LIVE_SUPABASE_SMOKE=1 npm run test:e2e` performs opt-in read-only live database checks.

Guides: docs/CMS_ARCHITECTURE.md, EDITOR_GUIDE.md, MEDIA_MANAGEMENT.md, PUBLISHING_WORKFLOW.md, COMMENTS_MODERATION.md, ANALYTICS.md, API.md and SECURITY.md. Keep service-role/rate/PIN/Cron secrets in server environment settings only. Supabase Cron is primary; Vercel preview requires the official repository connection and verified server configuration.
