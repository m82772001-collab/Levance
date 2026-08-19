"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/db/supabase-browser";

export function GoogleButton({ next = "/account" }: { next?: string }) {
  const [pending, setPending] = useState(false);

  async function continueWithGoogle() {
    setPending(true);
    const supabase = createSupabaseBrowserClient();
    const origin = window.location.origin;
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/account";
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      },
    });
    if (error || !data.url) {
      setPending(false);
      return;
    }
    window.location.assign(data.url);
  }

  return (
    <button
      type="button"
      onClick={continueWithGoogle}
      disabled={pending}
      className="flex w-full items-center justify-center gap-3 rounded border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-obsidian transition-colors hover:border-champagne disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span aria-hidden="true" className="font-semibold">G</span>
      {pending ? "Connecting…" : "Continue with Google"}
    </button>
  );
}
