import { requireAdmin } from "@/lib/auth";
import Catalog from "@/components/editor/catalog";
export default async function Page() {
  const { db, roles } = await requireAdmin();
  if (!roles.some((r) => ["OWNER", "ADMIN", "EDITOR"].includes(r)))
    return <p>هذه الإدارة تتطلب صلاحية تحرير.</p>;
  const { data, error } = await db
    .from("ticker_items")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("تعذر تحميل العناصر");
  return (
    <Catalog
      resource="ticker"
      title="الشريط والإعلانات"
      initial={data}
      fields={[
        { key: "text", label: "النص" },
        { key: "url", label: "الرابط", nullable: true },
        { key: "is_active", label: "مفعّل", kind: "boolean" },
        { key: "sort_order", label: "الترتيب", kind: "number" },
        { key: "starts_at", label: "بداية العرض UTC", kind: "datetime" },
        {
          key: "ends_at",
          label: "نهاية العرض UTC",
          kind: "datetime",
          nullable: true,
        },
        { key: "image_asset_id", label: "معرّف الصورة", nullable: true },
        { key: "style", label: "النمط: navy / gold / teal / burgundy" },
        {
          key: "pages",
          label: "المسارات المستهدفة: مصفوفة JSON",
          kind: "json",
        },
        { key: "placement", label: "الموضع: ticker / article" },
        { key: "sponsored", label: "إعلان مدفوع", kind: "boolean" },
      ]}
    />
  );
}
