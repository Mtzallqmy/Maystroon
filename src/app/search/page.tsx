import { posts } from "@/lib/content";
import { databaseConfigured } from "@/lib/env";
import { Empty, PostCard } from "@/components/content";
import Link from "next/link";
export const metadata = { title: "البحث", robots: { index: false } };
export default async function Search({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  let result: Awaited<ReturnType<typeof posts>> | null = null;
  let error = false;
  if (databaseConfigured()) {
    try {
      result = await posts(p);
    } catch {
      error = true;
    }
  }
  return (
    <section className="prose" style={{ maxWidth: "none" }}>
      <h1>ابحث بين السطور</h1>
      <form action="/search" className="search-form">
        <label style={{ flex: 1 }}>
          عنوان التدوينة
          <input
            name="q"
            defaultValue={p.q || ""}
            maxLength={100}
            placeholder="ما الذي تود قراءته؟"
          />
        </label>
        <button className="button" type="submit">
          بحث
        </button>
      </form>
      {result?.data.length ? (
        <>
          <div className="grid">
            {result.data.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          <div className="pagination">
            {result.page > 1 && (
              <Link
                href={
                  "/search?" +
                  new URLSearchParams({
                    q: p.q || "",
                    page: String(result.page - 1),
                  })
                }
              >
                السابق
              </Link>
            )}
            {result.total > result.page * result.pageSize && (
              <Link
                href={
                  "/search?" +
                  new URLSearchParams({
                    q: p.q || "",
                    page: String(result.page + 1),
                  })
                }
              >
                التالي
              </Link>
            )}
          </div>
        </>
      ) : (
        <Empty
          title={
            error
              ? "تعذّر البحث"
              : !databaseConfigured()
                ? "البحث قيد التجهيز"
                : "لا توجد نتائج"
          }
          description={
            error
              ? "تحقق من خيارات البحث وحاول لاحقاً."
              : "تظهر هنا التدوينات المنشورة المتاحة للقراءة."
          }
        />
      )}
    </section>
  );
}
