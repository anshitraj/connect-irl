import { serverSupabase } from "./supabase/server";
import type { Profile, Project } from "./types";
import { profileSchema, projectSchema } from "./validation";
export async function publicProfile(username: string): Promise<Profile | null> {
  const sb = await serverSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from("profiles")
    .select("data")
    .eq("username", username)
    .eq("is_public", true)
    .maybeSingle();
  const parsed = profileSchema.safeParse(data?.data);
  return parsed.success ? parsed.data : null;
}
export async function publicProject(slug: string): Promise<Project | null> {
  const sb = await serverSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from("projects")
    .select("data")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  const parsed = projectSchema.safeParse(data?.data);
  return parsed.success ? parsed.data : null;
}
