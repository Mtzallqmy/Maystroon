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
