import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/noto-naskh-arabic/700.css";
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Header } from "@/components/header";
import { homeData, publicSettings } from "@/lib/content";
import { siteUrl, databaseConfigured } from "@/lib/env";
export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: "ما يسطرون | مساحة للمعرفة والحكاية",
    template: "%s | ما يسطرون",
  },
  description:
    "منصة عربية للمعرفة والثقافة والناس والحياة، من اليمن إلى آفاق أوسع.",
  openGraph: { locale: "ar_YE", type: "website", siteName: "ما يسطرون" },
  twitter: { card: "summary_large_image" },
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await homeData();
  let socials: { label: string; url: string }[] = [];
  if (databaseConfigured()) {
    try {
      const settings = await publicSettings();
      const value = settings.find((s) => s.key === "social_links")?.value;
      if (Array.isArray(value))
        socials = value.filter(
          (v): v is { label: string; url: string } =>
            typeof v?.label === "string" &&
            typeof v?.url === "string" &&
            v.url.startsWith("https://"),
        );
    } catch {}
  }
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <a className="skip" href="#main">
          انتقل إلى المحتوى
        </a>
        <Header categories={data.categories} />
        <main id="main" className="wrap">
          {children}
        </main>
        <footer className="footer">
          <div className="wrap">
            <div className="footer-top">
              <div>
                <Link href="/" className="brand">
                  ما يسطرون
                </Link>
                <p>حروف تحمل المعرفة، وحكايات تفتح الأفق.</p>
              </div>
              <nav className="footer-links" aria-label="روابط التذييل">
                {data.categories.map((c) => (
                  <Link key={c.id} href={"/categories/" + c.slug}>
                    {c.name}
                  </Link>
                ))}
                <Link href="/about">حول ما يسطرون</Link>
                <Link href="/privacy">سياسة الخصوصية</Link>
                {socials.map((s) => (
                  <a key={s.url} href={s.url} rel="noopener noreferrer">
                    {s.label}
                  </a>
                ))}
              </nav>
            </div>
            <p className="copyright">
              حقوق الطبع والنشر © معتز العلقمي — اليمن، تعز — 2026م.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
export const dynamic = "force-dynamic";
