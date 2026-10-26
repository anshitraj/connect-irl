import { authorizeMutation } from "@/lib/api-security";
import { events } from "@/lib/events";
import { z } from "zod";
import { serverSupabase } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const sb = await serverSupabase();
  if (!sb) return Response.json({ expiresAt: "" });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return Response.json({ expiresAt: "" });
  const { data } = await sb
    .from("event_checkins")
    .select("expires_at")
    .eq("user_id", user.id)
    .eq("event_id", new URL(request.url).searchParams.get("event") || "")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return Response.json({ expiresAt: data?.expires_at || "" });
}
export async function POST(request: Request) {
  const auth = await authorizeMutation(request);
  if (auth.error) return auth.error;
  const parsed = z
    .object({ eventId: z.string(), active: z.boolean() })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success || !events.some((e) => e.id === parsed.data.eventId))
    return Response.json(
      { error: "Select a verified event." },
      { status: 400 },
    );
  const expiresAt = new Date(Date.now() + 2 * 3600e3).toISOString();
  if (parsed.data.active) {
    const { data: profile } = await auth.sb
      .from("profiles")
      .select("id")
      .eq("id", auth.user.id)
      .eq("is_public", true)
      .eq("discoverable", true)
      .maybeSingle();
    if (!profile)
      return Response.json(
        {
          error:
            "Publish your profile and enable discovery before opting into venue visibility.",
        },
        { status: 400 },
      );
  }
  const { error } = parsed.data.active
    ? await auth.sb.from("event_checkins").upsert(
        {
          user_id: auth.user.id,
          event_id: parsed.data.eventId,
          expires_at: expiresAt,
        },
        { onConflict: "user_id,event_id" },
      )
    : await auth.sb
        .from("event_checkins")
        .delete()
        .eq("user_id", auth.user.id)
        .eq("event_id", parsed.data.eventId);
  return Response.json(
    error ? { error: "Check-in could not be updated." } : { expiresAt },
    { status: error ? 500 : 200 },
  );
}
