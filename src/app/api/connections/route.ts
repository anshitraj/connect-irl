import { serverSupabase } from "@/lib/supabase/server";
import { authorizeMutation } from "@/lib/api-security";
import { profileSchema } from "@/lib/validation";
import { z } from "zod";
export async function GET() {
  const sb = await serverSupabase();
  if (!sb)
    return Response.json(
      { error: "Cloud connections are not configured." },
      { status: 503 },
    );
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user)
    return Response.json(
      { error: "Sign in to see connection activity." },
      { status: 401 },
    );
  const { data, error } = await sb
    .from("connection_receipts")
    .select("id,actor_id,created_at,read_at")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error)
    return Response.json(
      {
        error:
          "Connection activity could not load. Apply the connection-receipts migration.",
      },
      { status: 503 },
    );
  const ids = [...new Set((data || []).map((item) => item.actor_id))];
  const people = ids.length
    ? await sb
        .from("profiles")
        .select("data")
        .eq("is_public", true)
        .in("id", ids)
    : { data: [], error: null };
  if (people.error)
    return Response.json(
      { error: "Connection profiles could not load." },
      { status: 503 },
    );
  const profiles = (people.data || []).flatMap((item) => {
    const parsed = profileSchema.safeParse(item.data);
    return parsed.success ? [parsed.data] : [];
  });
  return Response.json(
    {
      receipts: (data || []).flatMap((item) => {
        const actor = profiles.find((profile) => profile.id === item.actor_id);
        return actor
          ? [
              {
                id: item.id,
                createdAt: item.created_at,
                readAt: item.read_at,
                actor: {
                  id: actor.id,
                  username: actor.username,
                  name: actor.name,
                  avatar: actor.avatar,
                  headline: actor.headline,
                },
              },
            ]
          : [];
      }),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function POST(request: Request) {
  const auth = await authorizeMutation(request);
  if (auth.error) return auth.error;
  const parsed = z
    .object({ id: z.uuid() })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: "Invalid connection receipt." },
      { status: 400 },
    );
  const { error } = await auth.sb.rpc("mark_connection_receipt_read", {
    target: parsed.data.id,
  });
  return error
    ? Response.json(
        { error: "Activity could not be marked as read." },
        { status: 503 },
      )
    : Response.json({ read: true });
}
