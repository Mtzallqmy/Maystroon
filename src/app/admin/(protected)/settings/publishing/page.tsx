import { requireAdmin } from "@/lib/auth";
import PublishingSettings from "@/components/editor/publishing-settings";
export default async function Page() {
  const { db, roles } = await requireAdmin();
  if (!roles.some((r) => ["OWNER", "ADMIN"].includes(r)))
    return <p>الإعدادات مخصصة للمالك والمدير.</p>;
  const { data, error } = await db
    .from("site_settings")
    .select("value")
    .eq("key", "publishing")
    .single();
  if (error) throw new Error("تعذر تحميل إعدادات النشر");
  return <PublishingSettings initial={data.value} />;
}
