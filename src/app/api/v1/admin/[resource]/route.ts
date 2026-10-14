import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { cmsCommand } from "@/lib/cms";
import { sameOrigin } from "@/lib/origin";
import { failure } from "@/lib/api";
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ resource: string }> },
) {
  if (!sameOrigin(req)) return failure("INVALID_ORIGIN", 403);
  if (Number(req.headers.get("content-length") || 0) > 1000000)
    return failure("PAYLOAD_TOO_LARGE", 413);
  try {
    const body = await req.text();
    if (body.length > 1000000) return failure("PAYLOAD_TOO_LARGE", 413);
    return NextResponse.json({
      data: await cmsCommand((await params).resource, JSON.parse(body)),
    });
  } catch (e) {
    if (e instanceof ZodError || e instanceof SyntaxError)
      return failure("INVALID_INPUT", 400);
    const code = e instanceof Error ? e.message : "SERVICE_UNAVAILABLE";
    return failure(
      code,
      ["UNAUTHORIZED"].includes(code)
        ? 401
        : code === "FORBIDDEN"
          ? 403
          : code === "VERSION_CONFLICT"
            ? 409
            : 400,
    );
  }
}
