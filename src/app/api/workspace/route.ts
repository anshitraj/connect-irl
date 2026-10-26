import { after } from "next/server";
import { authorizeMutation } from "@/lib/api-security";
import { notifyNewConnections } from "@/lib/email/notify-connections";
import { serverSupabase } from "@/lib/supabase/server";
import { syncSchema } from "@/lib/validation";
export async function GET() {
  const sb = await serverSupabase();
  if (!sb)
    return Response.json({ error: "Cloud unavailable" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const results = await Promise.all([
    sb.from("profiles").select("data").eq("id", user.id).maybeSingle(),
    sb.from("saved_contacts").select("data").eq("owner_id", user.id),
    sb.from("projects").select("data").eq("owner_id", user.id),
    sb.from("follow_up_reminders").select("data").eq("owner_id", user.id),
    sb
      .from("profile_preferences")
      .select("data")
      .eq("owner_id", user.id)
      .maybeSingle(),
  ]);
  if (results.some((r) => r.error))
    return Response.json(
      { error: "Could not load your workspace." },
      { status: 503 },
    );
  return Response.json({
    profile: results[0].data?.data || null,
    contacts: results[1].data?.map((r) => r.data) || [],
    projects: results[2].data?.map((r) => r.data) || [],
    reminders: results[3].data?.map((r) => r.data) || [],
    bookmarks: results[4].data?.data?.bookmarks || [],
    eventBookmarks: results[4].data?.data?.eventBookmarks || [],
    blocked: results[4].data?.data?.blocked || [],
    activeEventId: results[4].data?.data?.activeEventId || "",
    eventIds: results[4].data?.data?.eventIds || [],
  });
}
export async function POST(request: Request) {
  const auth = await authorizeMutation(request);
  if (auth.error) return auth.error;
  const { sb, user } = auth;
  if (Number(request.headers.get("content-length")) > 5_000_000)
    return Response.json(
      { error: "Workspace exceeds upload limit." },
      { status: 413 },
    );
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 5_000_000)
      return Response.json(
        { error: "Workspace exceeds upload limit." },
        { status: 413 },
      );
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = syncSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message || "Invalid workspace." },
      { status: 400 },
    );
  const payload = parsed.data;
  // One transaction; ownership is also enforced by RLS inside the invoker function.
  const { data: contactIds, error } = await sb.rpc("sync_workspace", {
    payload: {
      ...payload,
      profile: payload.profile ? { ...payload.profile, id: user.id } : null,
      projects: payload.projects.map((p) => ({ ...p, ownerId: user.id })),
    },
  });
  if (error)
    return Response.json(
      {
        error:
          error.code === "23505"
            ? "That username or project address is already taken."
            : "Your changes could not sync. They remain on this device.",
      },
      { status: 409 },
    );
  // Saving a public profile records a receipt in the same transaction; email its owner
  // after the response so sync latency never depends on the mail provider.
  if (payload.contacts.length) after(() => notifyNewConnections(user.id));
  const canonicalIds = Object.values(contactIds || {}) as string[];
  const { data: contacts } = canonicalIds.length
    ? await sb
        .from("saved_contacts")
        .select("data")
        .eq("owner_id", user.id)
        .in("id", canonicalIds)
    : { data: [] };
  return Response.json({
    synced: true,
    contactIds: contactIds || {},
    contacts: contacts?.map((c) => c.data) || [],
  });
}
