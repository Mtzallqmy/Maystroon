import { requireAdmin } from "@/lib/auth";
import Studio, { type PostRecord } from "@/components/editor/studio";
import { notFound } from "next/navigation";
import { z } from "zod";
export default async function Edit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { db, roles } = await requireAdmin();
  const id = (await params).id;
  if (!z.uuid().safeParse(id).success) notFound();
  const [p, a, c, links] = await Promise.all([
    db.from("posts").select("*").eq("id", id).maybeSingle(),
    db
      .from("authors")
      .select("id,display_name")
      .eq("is_active", true)
      .is("deleted_at", null),
    db
      .from("categories")
      .select("id,name")
      .eq("is_active", true)
      .is("deleted_at", null),
    db.from("post_categories").select("category_id").eq("post_id", id),
  ]);
  if (p.error || !p.data) notFound();
  if (a.error || c.error || links.error)
    throw new Error("تعذر تحميل خيارات التحرير");
  return (
    <Studio
      initial={
        {
          ...p.data,
          category_ids: links.data.map((x) => x.category_id),
        } as PostRecord
      }
      authors={a.data}
      categories={c.data}
      publisher={roles.some((r) => ["OWNER", "ADMIN", "EDITOR"].includes(r))}
    />
  );
}
