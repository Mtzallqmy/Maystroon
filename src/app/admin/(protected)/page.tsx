import { requireAdmin } from "@/lib/auth";
export default async function Dashboard() {
  const { db, roles } = await requireAdmin();
  const stats = await Promise.all(
    ["posts", "categories", "authors"].map(async (table) => {
      const { count, error } = await db
        .from(table)
        .select("id", { head: true, count: "exact" });
      return { table, count: error ? null : count };
    }),
  );
  const labels: Record<string, string> = {
    posts: "التدوينات المتاحة",
    categories: "الأقسام المتاحة",
    authors: "الكتّاب المتاحون",
  };
  return (
    <>
      <span className="eyebrow">لوحة الإدارة</span>
      <h1>أهلاً بك في ما يسطرون</h1>
      <p>صلاحيات الحساب: {roles.join("، ")}</p>
      <div className="stats">
        {stats.map((s) => (
          <div className="stat" key={s.table}>
            <span>{labels[s.table]}</span>
            <strong>{s.count ?? "غير متاح"}</strong>
          </div>
        ))}
      </div>
      <p className="status" style={{ marginTop: 25 }}>
        أساس الإدارة جاهز. النشر والمحرر المتقدم وإدارة المشرفين تُستكمل في
        المراحل القادمة.
      </p>
    </>
  );
}
