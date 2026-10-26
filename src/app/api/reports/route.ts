import { authorizeMutation } from "@/lib/api-security";
import { z } from "zod";
export async function POST(request: Request) {
  const auth = await authorizeMutation(request);
  if (auth.error) return auth.error;
  const body = z
    .object({
      profileId: z.uuid(),
      reason: z.string().trim().min(10).max(2000),
    })
    .safeParse(await request.json().catch(() => null));
  if (!body.success)
    return Response.json(
      { error: "Provide a reason of 10–2000 characters." },
      { status: 400 },
    );
  const { error } = await auth.sb.from("reports").insert({
    reporter_id: auth.user.id,
    profile_id: body.data.profileId,
    reason: body.data.reason,
  });
  return Response.json(
    error ? { error: "Report could not be submitted." } : { submitted: true },
    { status: error ? 500 : 200 },
  );
}
