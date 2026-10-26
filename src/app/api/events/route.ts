import { authorizeMutation } from "@/lib/api-security";
import { safeUrl } from "@/lib/utils";
import { z } from "zod";
export async function POST(request: Request) {
  const auth = await authorizeMutation(request);
  if (auth.error) return auth.error;
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(150),
      url: z
        .string()
        .max(2048)
        .refine((v) => Boolean(safeUrl(v))),
      notes: z.string().max(2000),
    })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: "Add an event name and a valid official URL." },
      { status: 400 },
    );
  const { error } = await auth.sb
    .from("event_submissions")
    .insert({ submitted_by: auth.user.id, ...parsed.data });
  return Response.json(
    error ? { error: "Event could not be submitted." } : { submitted: true },
    { status: error ? 500 : 200 },
  );
}
