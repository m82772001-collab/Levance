import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { claimGuestCart } from "@/lib/cart/service";

function safeNext(value: string | null): string {
  if (!value) return "/account";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError || !code) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "oauth_failed");
    return NextResponse.redirect(url);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "oauth_failed");
    return NextResponse.redirect(url);
  }

  try {
    await claimGuestCart(data.user.id);
  } catch {
    // Authentication remains valid if guest-cart migration cannot complete.
  }

  return NextResponse.redirect(new URL(next, request.url));
}
