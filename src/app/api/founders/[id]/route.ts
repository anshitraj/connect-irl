import { serverSupabase } from "@/lib/supabase/server";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = await serverSupabase();
  if (!sb || !/^[a-f0-9-]{36}$/i.test(id))
    return Response.json({ profile: null });
  const { data } = await sb
    .from("profiles")
    .select("data")
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle();
  return Response.json({ profile: data?.data || null });
}
