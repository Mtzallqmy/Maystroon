import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
export const metadata = { robots: { index: false, follow: false } };
const links = [
  ["", "نظرة عامة"],
  ["posts", "التدوينات"],
  ["categories", "الأقسام"],
  ["authors", "الكتّاب"],
  ["media", "الوسائط"],
  ["comments", "التعليقات"],
  ["scheduled", "النشر المجدول"],
  ["editorial", "التحرير"],
  ["settings/publishing", "إعدادات النشر"],
  ["users", "المستخدمون"],
  ["advertisements", "الإعلانات"],
  ["settings", "إعدادات المنصة"],
  ["account", "حسابي"],
];
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="admin">
      <aside aria-label="لوحة الإدارة">
        {links.map(([path, label]) => (
          <Link key={path} href={"/admin/" + path}>
            {label}
          </Link>
        ))}
        <form action="/auth/logout" method="post">
          <button className="button outline">تسجيل الخروج</button>
        </form>
      </aside>
      <section>{children}</section>
    </div>
  );
}
