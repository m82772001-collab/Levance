import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware responsibilities (kept intentionally narrow):
 *  1. Refresh the Supabase session cookie on every request.
 *  2. Coarse redirect for unauthenticated protected areas.
 *
 * This is a UX convenience layer only. It is NOT the security
 * boundary — membership for /showroom and /monarch is enforced in
 * layouts via requireShowroomAccess / requireMonarchAccess, and RLS
 * protects AI tables. Do not treat middleware as sufficient authorization.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const needsAuth =
    path.startsWith("/account") ||
    path.startsWith("/admin") ||
    path.startsWith("/showroom") ||
    path.startsWith("/monarch");

  if (needsAuth && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
