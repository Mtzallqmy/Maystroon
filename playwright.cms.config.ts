import { defineConfig, devices } from "@playwright/test";
const env = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54331",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "fixture-publishable-key",
  SUPABASE_SERVICE_ROLE_KEY: "fixture-service-role",
  RATE_LIMIT_SECRET: "fixture-only-rate-limit-secret-32-characters",
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
  CRON_SECRET: "fixture-only-cron-secret-32-characters",
};
export default defineConfig({
  testDir: "./tests/cms-e2e",
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
          args: [
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--use-gl=angle",
            "--use-angle=swiftshader",
          ],
        }
      : {},
  },
  webServer: [
    {
      command: "node tests/support/supabase-fixture.mjs",
      url: "http://127.0.0.1:54331/health",
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1",
      url: "http://127.0.0.1:3000",
      env,
      reuseExistingServer: false,
    },
  ],
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
