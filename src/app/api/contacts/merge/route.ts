import { authorizeMutation } from "@/lib/api-security";
import { z } from "zod";
export async function POST(request: Request) {
  const auth = await authorizeMutation(request);
  if (auth.error) return auth.error;
  const parsed = z
    .object({ sourceId: z.uuid(), targetId: z.uuid() })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: "Choose two saved connections." },
      { status: 400 },
    );
  const { data, error } = await auth.sb.rpc("merge_contacts", {
    source_id: parsed.data.sourceId,
    target_id: parsed.data.targetId,
  });
  if (error)
    return Response.json(
      {
        error:
          "Could not merge. Sync both contacts and download/remove any source audio first.",
      },
      { status: 409 },
    );
  return Response.json({ contact: data });
}
