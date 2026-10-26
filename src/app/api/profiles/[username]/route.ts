import { publicProfile } from "@/lib/public-data";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const profile = await publicProfile(username);
  return Response.json(
    profile
      ? { profile }
      : { error: "This profile is unavailable or private." },
    { status: profile ? 200 : 404 },
  );
}
