import { serverSupabase } from "@/lib/supabase/server";
import { projectSchema } from "@/lib/validation";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const sb = await serverSupabase();
  const result = sb
    ? await sb.from("projects").select("data").eq("slug", slug).maybeSingle()
    : null;
  const parsed = projectSchema.safeParse(result?.data?.data);
  const project = parsed.success ? parsed.data : null;
  return Response.json(
    project ? { project } : { error: "Project unavailable." },
    { status: project ? 200 : 404 },
  );
}
