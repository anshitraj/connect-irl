import { serverSupabase } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validation";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const sb = await serverSupabase();
  if (!sb) return Response.json({ members: [], profiles: [], viewerId: null });
  const { slug } = await params;
  const { data: project, error } = await sb
    .from("projects")
    .select("id,owner_id")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !project)
    return Response.json({ error: "Project unavailable." }, { status: 404 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  const { data: members, error: memberError } = await sb
    .from("project_members")
    .select("project_id,user_id,role")
    .eq("project_id", project.id);
  if (memberError)
    return Response.json({ error: "Team could not load." }, { status: 503 });
  const ids = [
    ...new Set([project.owner_id, ...(members || []).map((m) => m.user_id)]),
  ];
  const { data: profiles, error: profileError } = await sb
    .from("profiles")
    .select("data")
    .eq("is_public", true)
    .in("id", ids);
  if (profileError)
    return Response.json(
      { error: "Team profiles could not load." },
      { status: 503 },
    );
  return Response.json({
    members: members || [],
    profiles: (profiles || []).flatMap((p) => {
      const parsed = profileSchema.safeParse(p.data);
      return parsed.success ? [parsed.data] : [];
    }),
    viewerId: user?.id || null,
  });
}
