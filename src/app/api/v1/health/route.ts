import { NextResponse } from "next/server";
import { databaseConfigured } from "@/lib/env";
import { publicDatabase } from "@/lib/supabase";
export async function GET() {
  let database = "unconfigured";
  if (databaseConfigured()) {
    try {
      const { error } = await publicDatabase()
        .from("categories")
        .select("id")
        .limit(1);
      database = error ? "unavailable" : "ready";
    } catch {
      database = "unavailable";
    }
  }
  return NextResponse.json(
    { data: { service: "maystroon", version: "v1", database } },
    {
      status: database === "ready" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
