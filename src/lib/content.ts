import "server-only";
import { publicDatabase } from "./supabase";
import { databaseConfigured } from "./env";
import { querySchema } from "./validation";
export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
};
export type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  published_at: string;
  featured: boolean;
  reading_minutes: number;
  seo_title: string | null;
  seo_description: string | null;
  authors: { display_name: string; slug: string } | null;
};
export const publicPostFields =
  "id,title,slug,excerpt,content,cover_image,published_at,featured,reading_minutes,seo_title,seo_description,authors(display_name,slug)";
export async function categories(): Promise<Category[]> {
  const { data, error } = await publicDatabase()
    .from("categories")
    .select("id,name,slug,description,sort_order")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("sort_order");
  if (error) throw error;
  return data;
}
export async function posts(params: Record<string, string | undefined> = {}) {
  const p = querySchema.parse(params);
  const db = publicDatabase();
  let ids: string[] | undefined;
  if (p.category) {
    const { data, error } = await db
      .from("categories")
      .select("id")
      .eq("slug", p.category)
      .single();
    if (error || !data) return { data: [] as Post[], total: 0, ...p };
    const links = await db
      .from("post_categories")
      .select("post_id")
      .eq("category_id", data.id);
    if (links.error) throw links.error;
    ids = links.data.map((x) => x.post_id);
    if (!ids.length) return { data: [] as Post[], total: 0, ...p };
  }
  let query = db
    .from("posts")
    .select(publicPostFields, { count: "exact" })
    .eq("status", "published")
    .eq("visibility", "public")
    .is("deleted_at", null)
    .lte("published_at", new Date().toISOString());
  if (ids) query = query.in("id", ids);
  if (p.q) query = query.ilike("title", "%" + p.q.replace(/[\%_]/g, "") + "%");
  const { data, error, count } = await query
    .order("published_at", { ascending: p.sort === "oldest" })
    .order("id")
    .range((p.page - 1) * p.pageSize, p.page * p.pageSize - 1);
  if (error) throw error;
  return { data: data as unknown as Post[], total: count || 0, ...p };
}
export async function post(slug: string) {
  const { data, error } = await publicDatabase()
    .from("posts")
    .select(publicPostFields)
    .eq("slug", slug)
    .eq("status", "published")
    .eq("visibility", "public")
    .is("deleted_at", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Post | null;
}
export async function publicSettings() {
  const { data, error } = await publicDatabase()
    .from("site_settings")
    .select("key,value")
    .eq("is_public", true);
  if (error) throw error;
  return data;
}
export async function homeData() {
  if (!databaseConfigured())
    return {
      categories: [] as Category[],
      posts: [] as Post[],
      ticker: [] as { id: string; text: string; url: string | null }[],
      state: "unconfigured",
    };
  try {
    const [cats, result, ticker] = await Promise.all([
      categories(),
      posts(),
      publicDatabase()
        .from("ticker_items")
        .select("id,text,url")
        .eq("is_active", true)
        .lte("starts_at", new Date().toISOString())
        .or("ends_at.is.null,ends_at.gt." + new Date().toISOString())
        .order("sort_order"),
    ]);
    if (ticker.error) throw ticker.error;
    return {
      categories: cats,
      posts: result.data,
      ticker: ticker.data,
      state: "ready",
    };
  } catch {
    return { categories: [], posts: [], ticker: [], state: "error" };
  }
}
