import { requireAdmin } from "@/lib/auth";
import PostList from "@/components/editor/post-list";
export default async function Page() {
  const { db, roles } = await requireAdmin();
  const { data, error } = await db
    .from("posts")
    .select("id,title,slug,status,version,deleted_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("تعذر تحميل التدوينات");
  return (
    <PostList
      initial={data}
      publisher={roles.some((r) => ["OWNER", "ADMIN", "EDITOR"].includes(r))}
    />
  );
}
