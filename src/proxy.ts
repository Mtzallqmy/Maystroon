import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { databaseConfigured, publicEnv } from "./lib/env";
export async function proxy(request: NextRequest) {
  if (!databaseConfigured()) return NextResponse.next();
  let response = NextResponse.next({ request });
  const { url, key } = publicEnv();
  const db = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure:
              process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") ?? false,
          }),
        );
      },
    },
  });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (
    request.nextUrl.pathname.startsWith("/admin") &&
    request.nextUrl.pathname !== "/admin/login" &&
    (!user || !user.email_confirmed_at)
  ) {
    const redirect = NextResponse.redirect(
      new URL("/admin/login", request.url),
    );
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/admin/:path*", "/auth/:path*"] };
