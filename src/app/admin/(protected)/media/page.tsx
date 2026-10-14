import { requireAdmin } from "@/lib/auth";
import MediaLibrary from "@/components/editor/media-library";
export default async function Page() {
  const { db } = await requireAdmin();
  const { data, error } = await db
    .from("media_assets")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("تعذر تحميل الوسائط");
  return <MediaLibrary initial={data} />;
}
