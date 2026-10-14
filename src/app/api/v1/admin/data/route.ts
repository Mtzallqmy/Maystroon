import { NextRequest, NextResponse } from "next/server";
import { authorizedUser } from "@/lib/auth";
import { failure } from "@/lib/api";
import { z } from "zod";
export async function GET(req: NextRequest) {
  const identity = await authorizedUser();
  if (!identity) return failure("UNAUTHORIZED", 401);
  const resource = req.nextUrl.searchParams.get("resource");
  const tables: Record<string, string> = {
    posts: "posts",
    categories: "categories",
    authors: "authors",
    media: "media_assets",
    comments: "comments",
    ticker: "ticker_items",
    revisions: "post_revisions",
    runs: "publishing_runs",
  };
  if (!resource || !tables[resource]) return failure("INVALID_RESOURCE", 400);
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .safeParse(req.nextUrl.searchParams.get("page") || 1);
  if (!page.success) return failure("INVALID_INPUT", 400);
  const fields =
    resource === "posts"
      ? "id,title,slug,status,version,deleted_at,updated_at"
      : resource === "revisions"
        ? "id,created_at"
        : "*";
  let q = identity.db.from(tables[resource]).select(fields, { count: "exact" });
  if (resource === "posts") {
    const search = req.nextUrl.searchParams.get("q") || "";
    if (search.length > 100) return failure("INVALID_INPUT", 400);
    if (search) q = q.ilike("title", "%" + search.replace(/[\%_]/g, "") + "%");
    const status = req.nextUrl.searchParams.get("status");
    if (status) {
      if (status === "trash") q = q.not("deleted_at", "is", null);
      else {
        if (
          ![
            "draft",
            "review",
            "scheduled",
            "published",
            "unpublished",
            "archived",
          ].includes(status)
        )
          return failure("INVALID_INPUT", 400);
        q = q.eq("status", status).is("deleted_at", null);
      }
    }
  }
  if (resource === "revisions") {
    const id = z.uuid().safeParse(req.nextUrl.searchParams.get("post"));
    if (!id.success) return failure("INVALID_INPUT", 400);
    q = q.eq("post_id", id.data);
  }
  const { data, error, count } = await q
    .order("created_at", { ascending: false })
    .range((page.data - 1) * 100, page.data * 100 - 1);
  if (error) return failure("SERVICE_UNAVAILABLE", 503);
  return NextResponse.json(
    { data, total: count || 0, page: page.data, pageSize: 100 },
    { headers: { "Cache-Control": "no-store" } },
  );
}
