import { serverSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
// Email sign-in links carry a one-time token hash, so they work on whichever
// browser or device opens them. (A PKCE code, by contrast, can only be redeemed
// by the browser that asked for it, which breaks in-app mail browsers.)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash") || "";
  const sb = await serverSupabase();
  let destination = "/login?error=expired";
  if (sb && /^[A-Za-z0-9_-]{10,200}$/.test(tokenHash)) {
    // "email" covers both returning members (magic link) and first sign-ups.
    const { error } = await sb.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });
    if (!error) {
      const {
        data: { user },
      } = await sb.auth.getUser();
      const { data: profile, error: profileError } = user
        ? await sb.from("profiles").select("id").eq("id", user.id).maybeSingle()
        : { data: null, error: null };
      destination = profile || profileError ? "/app" : "/app/profile";
    }
  }
  const response = NextResponse.redirect(new URL(destination, url.origin));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
