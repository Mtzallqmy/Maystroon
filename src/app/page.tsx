import Link from "next/link";
import { BookOpen } from "lucide-react";
import { homeData, posts } from "@/lib/content";
import { Empty, PostCard } from "@/components/content";
import { Ticker } from "@/components/ticker";
export default async function Home() {
  const d = await homeData();
  const featured = d.posts.find((p) => p.featured);
  const sections =
    d.state === "ready"
      ? await Promise.all(
          d.categories.map(async (c) => ({
            category: c,
            posts: (await posts({ category: c.slug, pageSize: "3" })).data,
          })),
        ).catch(() => [])
      : [];
  return (
    <>
      <Ticker items={d.ticker} />
      <section className="intro">
        <div>
          <span className="eyebrow">المعرفة · الثقافة · الحياة</span>
          <h1>
            لكلّ فكرةٍ سطر،
            <br />
            ولكلّ سطرٍ أفق.
          </h1>
          <p>
            في ما يسطرون نقرأ العالم من زوايا متعددة، ونمنح المعرفة والحكاية
            مساحة تستحقها.
          </p>
          <Link href="/about" className="button outline">
            تعرّف على ما يسطرون
          </Link>
        </div>
        <div className="intro-mark" aria-hidden>
          <BookOpen />
        </div>
      </section>
      {d.state !== "ready" && (
        <p className="status" role="status">
          {d.state === "unconfigured"
            ? "المنصة في مرحلة التأسيس. لم يُربط مصدر المحتوى بعد."
            : "تعذّر تحميل المحتوى الآن. يرجى المحاولة لاحقاً."}
        </p>
      )}
      {featured && (
        <section className="section">
          <div className="section-heading">
            <h2>اختيار التحرير</h2>
          </div>
          <PostCard post={featured} />
        </section>
      )}
      <section className="section">
        <div className="section-heading">
          <h2>أحدث ما سُطّر</h2>
          <Link href="/search" className="eyebrow">
            استكشف التدوينات ←
          </Link>
        </div>
        {d.posts.length ? (
          <div className="grid">
            {d.posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </section>
      <section className="section">
        <div className="section-heading">
          <h2>أبواب المعرفة</h2>
        </div>
        {d.categories.length ? (
          <div className="grid">
            {d.categories.map((c) => (
              <Link
                className="category-card"
                key={c.id}
                href={"/categories/" + c.slug}
              >
                <h3>{c.name}</h3>
                <span>{c.description || "اكتشف تدوينات هذا القسم"} ←</span>
              </Link>
            ))}
          </div>
        ) : (
          <Empty
            title="الأقسام قيد التجهيز"
            description="ستظهر الأقسام المعتمدة بعد اكتمال ربط قاعدة البيانات."
          />
        )}
      </section>
      {sections
        .filter((s) => s.posts.length)
        .map((s) => (
          <section className="section" key={s.category.id}>
            <div className="section-heading">
              <h2>{s.category.name}</h2>
              <Link href={"/categories/" + s.category.slug}>عرض القسم ←</Link>
            </div>
            <div className="grid">
              {s.posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </section>
        ))}
    </>
  );
}
