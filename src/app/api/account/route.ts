import { authorizeMutation } from "@/lib/api-security";
import { createClient } from "@supabase/supabase-js";
export async function DELETE(request: Request) {
  const auth = await authorizeMutation(request);
  if (auth.error) return auth.error;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return Response.json(
      {
        error:
          "Account deletion needs the server administrator key. Contact your deployment administrator.",
      },
      { status: 503 },
    );
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  // Auth deletion does not remove Storage objects. Restrict cleanup to this owner.
  try {
    for (const bucket of ["avatars", "voice-notes"]) {
      const pending = [auth.user.id];
      const paths: string[] = [];
      while (pending.length) {
        const prefix = pending.pop()!;
        for (let offset = 0; ; offset += 100) {
          const { data: files, error: listingError } = await admin.storage
            .from(bucket)
            .list(prefix, { limit: 100, offset });
          if (listingError) throw listingError;
          for (const file of files || []) {
            const path = `${prefix}/${file.name}`;
            if (!path.startsWith(`${auth.user.id}/`))
              throw new Error("Invalid storage prefix");
            if (file.id) paths.push(path);
            else pending.push(path);
          }
          if (paths.length + pending.length > 10000)
            throw new Error("Administrator assistance needed.");
          if (!files || files.length < 100) break;
        }
      }
      for (let i = 0; i < paths.length; i += 100) {
        const { error: removeError } = await admin.storage
          .from(bucket)
          .remove(paths.slice(i, i + 100));
        if (removeError) throw removeError;
      }
    }
  } catch {
    return Response.json(
      {
        error:
          "File cleanup could not finish. Your account has not been deleted. Retry or contact the deployment administrator.",
      },
      { status: 503 },
    );
  }
  const { error } = await admin.auth.admin.deleteUser(auth.user.id);
  if (error)
    return Response.json(
      { error: "Account could not be deleted. Try again." },
      { status: 500 },
    );
  await auth.sb.auth.signOut();
  return Response.json({ deleted: true });
}
