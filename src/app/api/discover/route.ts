import { serverSupabase } from "@/lib/supabase/server";
import { profileSchema, projectSchema } from "@/lib/validation";
export async function GET(request: Request) {
  const sb = await serverSupabase();
  if (!sb) return Response.json({ profiles: [], projects: [] });
  const page = Math.max(
    0,
    Math.min(1000, Number(new URL(request.url).searchParams.get("page")) || 0),
  );
  const [profiles, projects] = await Promise.all([
    sb
      .from("profiles")
      .select("data")
      .eq("is_public", true)
      .eq("discoverable", true)
      .order("updated_at", { ascending: false })
      .range(page * 24, page * 24 + 23),
    sb
      .from("projects")
      .select("data")
      .eq("is_public", true)
      .order("updated_at", { ascending: false })
      .range(page * 24, page * 24 + 23),
  ]);
  if (profiles.error || projects.error)
    return Response.json(
      { error: "Discovery could not load. Please try again." },
      { status: 503 },
    );
  return Response.json({
    profiles: (profiles.data || []).flatMap((p) => {
      const parsed = profileSchema.safeParse(p.data);
      return parsed.success ? [parsed.data] : [];
    }),
    projects: (projects.data || []).flatMap((p) => {
      const parsed = projectSchema.safeParse(p.data);
      return parsed.success ? [parsed.data] : [];
    }),
  });
}
