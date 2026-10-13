import { NextResponse, type NextRequest } from "next/server";
import { authorizedUser } from "@/lib/auth";
import { privilegedDatabase, publicDatabase } from "@/lib/supabase";
import { sameOrigin } from "@/lib/origin";
import { rateLimit } from "@/lib/rate-limit";
import { pinSchema } from "@/lib/validation";
import { hashPin } from "@/lib/pin";
import { failure } from "@/lib/api";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return failure("FORBIDDEN", 403);
  try {
    const identity = await authorizedUser();
    if (!identity) return failure("UNAUTHORIZED", 401);
    if (!(await rateLimit("pin:" + identity.user.id, 5, 900)))
      return failure("RATE_LIMITED", 429);
    const body = await request.json();
    const pin = pinSchema.safeParse(body.pin);
    if (
      !pin.success ||
      typeof body.password !== "string" ||
      body.password.length > 128
    )
      return failure("INVALID_INPUT", 400);
    const { error } = await publicDatabase().auth.signInWithPassword({
      email: identity.user.email!,
      password: body.password,
    });
    if (error) return failure("REAUTHENTICATION_REQUIRED", 401);
    const result = await privilegedDatabase().rpc("set_account_pin", {
      p_user_id: identity.user.id,
      p_hash: hashPin(pin.data),
    });
    if (result.error) throw result.error;
    return NextResponse.json(
      { data: { saved: true } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return failure("SERVICE_UNAVAILABLE", 503);
  }
}
