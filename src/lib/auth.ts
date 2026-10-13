import "server-only";
import { redirect } from "next/navigation";
import { databaseConfigured } from "./env";
import { sessionDatabase } from "./supabase";
export async function authorizedUser() {
  if (!databaseConfigured()) return null;
  const db = await sessionDatabase();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user || !user.email_confirmed_at) return null;
  const { data, error: roleError } = await db
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);
  if (roleError) return null;
  const names = (data || []).flatMap((x) => {
    const r = x.roles as unknown as { name: string } | null;
    return r ? [r.name] : [];
  });
  if (!names.some((x) => ["OWNER", "ADMIN", "EDITOR", "AUTHOR"].includes(x)))
    return null;
  return { user, roles: names, db };
}
export async function requireAdmin() {
  const identity = await authorizedUser();
  if (!identity) redirect("/admin/login");
  return identity;
}
