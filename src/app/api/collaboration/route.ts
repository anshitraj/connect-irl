import { authorizeMutation } from "@/lib/api-security";
import { serverSupabase } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validation";
import { z } from "zod";
export async function GET() {
  const sb = await serverSupabase();
  if (!sb)
    return Response.json(
      {
        error:
          "Cloud collaboration is not configured. Sign-in and Supabase setup are required.",
      },
      { status: 503 },
    );
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user)
    return Response.json(
      { error: "Sign in to open your private collaboration inbox." },
      { status: 401 },
    );
  const [requests, invitations, owned, memberships] = await Promise.all([
    sb
      .from("project_collaboration_requests")
      .select("id,project_id,sender_id,message,status,created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    sb
      .from("project_invitations")
      .select("id,project_id,invited_by,invitee_id,role,status,created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    sb.from("projects").select("id").eq("owner_id", user.id),
    sb
      .from("project_members")
      .select("project_id,user_id,role")
      .eq("user_id", user.id),
  ]);
  if ([requests, invitations, owned, memberships].some((r) => r.error))
    return Response.json(
      {
        error:
          "Your inbox could not load. Check the collaboration migration and try again.",
      },
      { status: 503 },
    );
  const ids = [
    ...new Set([
      ...(requests.data || []).map((r) => r.project_id),
      ...(invitations.data || []).map((r) => r.project_id),
      ...(owned.data || []).map((r) => r.id),
      ...(memberships.data || []).map((r) => r.project_id),
    ]),
  ];
  const { data: projects, error } = await sb.rpc("project_summaries", { ids });
  if (error)
    return Response.json(
      { error: "Project summaries could not load." },
      { status: 503 },
    );
  const summaries = (projects || []) as { ownerId: string }[];
  const people = [
    ...new Set([
      ...(requests.data || []).map((r) => r.sender_id),
      ...(invitations.data || []).flatMap((r) => [r.invitee_id, r.invited_by]),
      ...summaries.map((p) => p.ownerId),
    ]),
  ];
  const profiles = people.length
    ? await sb
        .from("profiles")
        .select("data")
        .eq("is_public", true)
        .in("id", people)
    : { data: [], error: null };
  if (profiles.error)
    return Response.json(
      { error: "Builder profiles could not load." },
      { status: 503 },
    );
  return Response.json({
    viewerId: user.id,
    requests: requests.data,
    invitations: invitations.data,
    projects: projects || [],
    memberships: memberships.data,
    profiles: (profiles.data || []).flatMap((p) => {
      const parsed = profileSchema.safeParse(p.data);
      return parsed.success ? [parsed.data] : [];
    }),
  });
}
const mutation = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("request"),
    target: z.uuid(),
    body: z.object({ message: z.string().trim().min(1).max(2000) }),
  }),
  z.object({
    action: z.literal("respond_request"),
    target: z.uuid(),
    body: z.object({ decision: z.enum(["accepted", "declined"]) }),
  }),
  z.object({
    action: z.literal("withdraw_request"),
    target: z.uuid(),
    body: z.object({}).default({}),
  }),
  z.object({
    action: z.literal("invite"),
    target: z.uuid(),
    body: z.object({
      username: z
        .string()
        .min(2)
        .max(40)
        .regex(/^[a-z0-9][a-z0-9_-]+$/),
      role: z.string().trim().min(1).max(100),
    }),
  }),
  z.object({
    action: z.literal("respond_invitation"),
    target: z.uuid(),
    body: z.object({ decision: z.enum(["accepted", "declined"]) }),
  }),
  z.object({
    action: z.literal("revoke_invitation"),
    target: z.uuid(),
    body: z.object({}).default({}),
  }),
  z.object({
    action: z.literal("remove_member"),
    target: z.uuid(),
    body: z.object({ userId: z.uuid() }),
  }),
  z.object({
    action: z.literal("set_member_role"),
    target: z.uuid(),
    body: z.object({
      userId: z.uuid(),
      role: z.string().trim().min(1).max(100),
    }),
  }),
]);
export async function POST(request: Request) {
  const auth = await authorizeMutation(request, { rateLimit: false });
  if (auth.error) return auth.error;
  const text = await request.text();
  if (text.length > 12000)
    return Response.json({ error: "Request is too large." }, { status: 413 });
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = mutation.safeParse(raw);
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message || "Invalid action." },
      { status: 400 },
    );
  const { data, error } = await auth.sb.rpc(
    "collaboration_action",
    parsed.data,
  );
  if (error) {
    const known = ["22023", "42501", "P0001", "P0002", "23505"].includes(
      error.code,
    );
    return Response.json(
      {
        error: known
          ? error.message
          : "Could not save this collaboration change.",
      },
      {
        status:
          error.code === "42501"
            ? 403
            : error.code === "P0002"
              ? 404
              : error.code === "P0001"
                ? 429
                : 409,
      },
    );
  }
  return Response.json({ saved: true, ...data });
}
