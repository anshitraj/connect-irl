import { authorizeMutation } from "@/lib/api-security";
import { lookupXPhoto, PhotoLookupError } from "@/lib/x-profile";
import { fetchCompanyIcon } from "@/lib/company-icon";
import { z } from "zod";
export const runtime = "nodejs";
const bodySchema = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("x"), handle: z.string().max(200) }),
  z.object({ provider: z.literal("company"), website: z.string().max(2048) }),
]);
export async function POST(request: Request) {
  const auth = await authorizeMutation(request);
  if (auth.error) return auth.error;
  if (Number(request.headers.get("content-length")) > 4096)
    return Response.json(
      { error: "Profile lookup request is too large." },
      { status: 413 },
    );
  const text = await request.text();
  if (text.length > 4096)
    return Response.json(
      { error: "Profile lookup request is too large." },
      { status: 413 },
    );
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid profile lookup." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success)
    return Response.json(
      { error: "Check the handle or website address." },
      { status: 400 },
    );
  try {
    if (parsed.data.provider === "x")
      return Response.json(
        await lookupXPhoto(parsed.data.handle, request.signal),
      );
    const image = await fetchCompanyIcon(parsed.data.website, request.signal);
    if (request.signal.aborted) return new Response(null, { status: 499 });
    const path = `${auth.user.id}/company-${crypto.randomUUID()}.${image.extension}`;
    const { error } = await auth.sb.storage
      .from("avatars")
      .upload(path, image.bytes, {
        contentType: image.contentType,
        upsert: false,
      });
    if (error)
      return Response.json(
        {
          error:
            "The website icon couldn’t be saved. You can continue with company initials.",
        },
        { status: 503 },
      );
    return Response.json({
      logo: auth.sb.storage.from("avatars").getPublicUrl(path).data.publicUrl,
    });
  } catch (error) {
    if (error instanceof PhotoLookupError)
      return Response.json({ error: error.message }, { status: error.status });
    return Response.json(
      {
        error:
          parsed.data.provider === "x"
            ? "The X photo couldn’t load right now. You can continue and try later."
            : "No website icon available. Company initials will be used.",
      },
      { status: 422 },
    );
  }
}
