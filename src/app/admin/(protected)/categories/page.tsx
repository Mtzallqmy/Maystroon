import { requireAdmin } from "@/lib/auth";
export default async function Categories() {
  const { db } = await requireAdmin();
  const { data, error } = await db
    .from("categories")
    .select("id,name,slug,is_active,sort_order")
    .is("deleted_at", null)
    .order("sort_order");
  return (
    <>
      <h1>إدارة الأقسام</h1>
      <p className="status">
        عرض فعلي للأقسام. التحرير يُفعّل في المرحلة الثانية.
      </p>
      {error ? (
        <p>تعذّر قراءة الأقسام.</p>
      ) : (
        <div className="grid">
          {data?.map((c) => (
            <div className="category-card" key={c.id}>
              <h3>{c.name}</h3>
              <span>
                {c.slug} · {c.is_active ? "ظاهر" : "مخفي"} · الترتيب{" "}
                {c.sort_order}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
