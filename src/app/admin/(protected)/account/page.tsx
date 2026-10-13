import { requireAdmin } from "@/lib/auth";
import { PinForm } from "./pin-form";
export default async function Account() {
  const { user } = await requireAdmin();
  return (
    <>
      <h1>إعدادات حسابي</h1>
      <p>{user.email}</p>
      <p>
        البريد مؤكد عبر Supabase Auth. تعيين PIN متاح للحساب المخوّل بعد
        المصادقة؛ لا يستبدل كلمة المرور.
      </p>
      <PinForm />
    </>
  );
}
