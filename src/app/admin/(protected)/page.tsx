import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
const weekStart = () =>
  new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
export default async function Page() {
  const { db, roles } = await requireAdmin();
  const staff = roles.some((r) => ["OWNER", "ADMIN", "EDITOR"].includes(r));
  const [p, c, v, runs] = await Promise.all([
    db
      .from("posts")
      .select("status", { count: "exact" })
      .is("deleted_at", null),
    staff
      ? db
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
      : Promise.resolve({ count: 0, error: null }),
    staff
      ? db.from("post_view_daily").select("day,views").gte("day", weekStart())
      : Promise.resolve({ data: [], error: null }),
    staff
      ? db
          .from("publishing_runs")
          .select("id,status,trigger,reason,created_at")
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (p.error || c.error || v.error || runs.error)
    throw new Error("تعذر تحميل الإحصائيات");
  const totals = new Map<string, number>();
  for (const x of v.data || [])
    totals.set(x.day, (totals.get(x.day) || 0) + Number(x.views));
  return (
    <>
      <span className="eyebrow">MAYSTROON · استوديو النشر</span>
      <h1>لوحة التحرير</h1>
      <div className="stats">
        <article>
          <h2>{p.count || 0}</h2>
          <p>تدوينات متاحة لحسابك</p>
        </article>
        <article>
          <h2>{p.data?.filter((x) => x.status === "published").length || 0}</h2>
          <p>منشورة</p>
        </article>
        {staff && (
          <>
            <article>
              <h2>{c.count || 0}</h2>
              <p>تعليقات تنتظر المراجعة</p>
            </article>
            <article>
              <h2>{[...totals.values()].reduce((a, b) => a + b, 0)}</h2>
              <p>مشاهدات آخر أسبوع</p>
            </article>
          </>
        )}
      </div>
      <Link className="button" href="/admin/posts/new">
        ابدأ تدوينة
      </Link>
      {staff && (
        <>
          <h2>المشاهدات اليومية</h2>
          {[...totals].sort().map(([day, total]) => (
            <p key={day}>
              {day}: {total}
            </p>
          ))}
          {!totals.size && <p>لا توجد مشاهدات مسجلة.</p>}
          <h2>سجل النشر</h2>
          {runs.data?.map((r) => (
            <p key={r.id}>
              {r.created_at} · {r.trigger} · {r.status} {r.reason}
            </p>
          ))}
          {!runs.data?.length && <p>لم تُنفذ عمليات نشر بعد.</p>}
        </>
      )}
    </>
  );
}
