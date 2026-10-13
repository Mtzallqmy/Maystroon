import { notFound } from "next/navigation";
import { post } from "@/lib/content";
import { databaseConfigured, siteUrl } from "@/lib/env";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!databaseConfigured()) return {};
  const p = await post((await params).slug);
  if (!p) return {};
  return {
    title: p.seo_title || p.title,
    description: p.seo_description || p.excerpt,
    alternates: { canonical: "/posts/" + p.slug },
    openGraph: {
      type: "article",
      title: p.seo_title || p.title,
      description: p.excerpt || "",
      publishedTime: p.published_at,
      url: "/posts/" + p.slug,
    },
  };
}
export default async function Article({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!databaseConfigured()) notFound();
  const p = await post((await params).slug);
  if (!p) notFound();
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.title,
    datePublished: p.published_at,
    author: {
      "@type": "Person",
      name: p.authors?.display_name || "هيئة التحرير",
    },
    mainEntityOfPage: new URL("/posts/" + p.slug, siteUrl()).href,
  };
  return (
    <article className="prose">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(ld).replace(/</g, "\u003c"),
        }}
      />
      <span className="eyebrow">
        {p.authors?.display_name} · {p.reading_minutes} دقائق قراءة
      </span>
      <h1>{p.title}</h1>
      <time dateTime={p.published_at}>
        {new Intl.DateTimeFormat("ar-YE", { dateStyle: "long" }).format(
          new Date(p.published_at),
        )}
      </time>
      <p>{p.content}</p>
    </article>
  );
}
