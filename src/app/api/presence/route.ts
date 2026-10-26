import { serverSupabase } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validation";
import { events } from "@/lib/events";
export async function GET(request: Request) {
  const sb = await serverSupabase();
  if (!sb)
    return Response.json(
      {
        error: "Cloud check-ins are not configured. No live presence is shown.",
      },
      { status: 503 },
    );
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user)
    return Response.json(
      { error: "Sign in to see builders who chose to share a venue check-in." },
      { status: 401 },
    );
  const search = new URL(request.url).searchParams;
  const event = search.get("event") || "";
  if (!events.some((e) => e.id === event))
    return Response.json(
      { error: "Choose a verified event." },
      { status: 400 },
    );
  const page = Math.max(
    0,
    Math.min(1000, Math.floor(Number(search.get("page")) || 0)),
  );
  const { data, error } = await sb.rpc("discover_venue_builders", {
    event_filter: event,
    query_text: (search.get("q") || "").slice(0, 300),
    ecosystem_filter: (search.get("ecosystem") || "").slice(0, 60),
    role_filter: (search.get("role") || "").slice(0, 60),
    goal_filter: (search.get("goal") || "").slice(0, 60),
    page_number: page,
  });
  if (error)
    return Response.json(
      { error: "Venue check-ins could not load. Try again." },
      { status: 503 },
    );
  const rows = (data || []) as {
    profile: unknown;
    eventId: string;
    expiresAt: string;
  }[];
  return Response.json({
    builders: rows.flatMap((row) => {
      const p = profileSchema.safeParse(row.profile);
      return p.success && Date.parse(row.expiresAt) > Date.now()
        ? [{ ...row, profile: p.data }]
        : [];
    }),
    hasMore: rows.length === 24,
    checkedAt: new Date().toISOString(),
  });
}
