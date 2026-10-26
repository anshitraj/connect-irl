import { serverSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const sb = await serverSupabase();
  if (sb && code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await sb.auth.getUser();
      const { data: profile, error: profileError } = user
        ? await sb.from("profiles").select("id").eq("id", user.id).maybeSingle()
        : { data: null, error: null };
      return NextResponse.redirect(
        new URL(profile || profileError ? "/app" : "/app/profile", url.origin),
      );
    }
  }
  return NextResponse.redirect(new URL("/login?error=expired", url.origin));
}
