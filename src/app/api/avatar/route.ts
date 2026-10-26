import { authorizeMutation } from "@/lib/api-security";
export async function POST(request: Request) {
  const auth = await authorizeMutation(request);
  if (auth.error) return auth.error;
  if (Number(request.headers.get("content-length")) > 2_100_000)
    return Response.json(
      { error: "Choose an image smaller than 2 MB." },
      { status: 413 },
    );
  const form = await request.formData();
  const file = form.get("file");
  if (
    !(file instanceof File) ||
    file.size > 2e6 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    return Response.json(
      { error: "Use JPEG, PNG, or WebP, smaller than 2 MB." },
      { status: 400 },
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
  const webp =
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!jpeg && !png && !webp)
    return Response.json(
      { error: "That file is not a supported image." },
      { status: 400 },
    );
  const contentType = png ? "image/png" : jpeg ? "image/jpeg" : "image/webp";
  const path = `${auth.user.id}/${crypto.randomUUID()}.${png ? "png" : jpeg ? "jpg" : "webp"}`;
  const { error } = await auth.sb.storage
    .from("avatars")
    .upload(path, bytes, { contentType, upsert: false });
  if (error)
    return Response.json(
      { error: "Avatar could not upload. Check storage configuration." },
      { status: 500 },
    );
  return Response.json({
    url: auth.sb.storage.from("avatars").getPublicUrl(path).data.publicUrl,
  });
}
