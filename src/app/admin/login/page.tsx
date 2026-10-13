import { databaseConfigured } from "@/lib/env";
import { LoginForm } from "./login-form";
export const metadata = {
  title: "دخول الإدارة",
  robots: { index: false, follow: false },
};
export default function Login() {
  return (
    <div className="prose">
      <h1>دخول الإدارة</h1>
      <p>
        سجّل الدخول بحساب مؤكد وممنوح صلاحية مسبقاً. تطابق البريد لا يمنح دور
        المالك.
      </p>
      {databaseConfigured() ? (
        <LoginForm />
      ) : (
        <p className="status">
          تسجيل الدخول غير مفعّل حتى ربط Supabase وإعداد الهوية.
        </p>
      )}
    </div>
  );
}
