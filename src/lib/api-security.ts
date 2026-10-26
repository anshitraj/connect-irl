import { serverSupabase } from "./supabase/server";
export async function authorizeMutation(
  request: Request,
  options: { rateLimit?: boolean } = {},
) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    return {
      error: Response.json(
        { error: "Invalid request origin." },
        { status: 403 },
      ),
    } as const;
  const sb = await serverSupabase();
  if (!sb)
    return {
      error: Response.json(
        { error: "Cloud is not configured." },
        { status: 503 },
      ),
    } as const;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user)
    return {
      error: Response.json({ error: "Sign in to continue." }, { status: 401 }),
    } as const;
  // Consent workflows apply their rate limit inside the database transaction,
  // including calls made directly through PostgREST.
  if (options.rateLimit === false) return { sb, user } as const;
  // Database-backed rate limiting works across serverless instances.
  const { data: permitted, error } = await sb.rpc("check_rate_limit", {
    bucket: "mutation",
    max_requests: 60,
    window_seconds: 60,
  });
  if (error)
    return {
      error: Response.json(
        {
          error:
            "Security configuration unavailable. Apply the database migration.",
        },
        { status: 503 },
      ),
    } as const;
  if (!permitted)
    return {
      error: Response.json(
        { error: "Too many requests. Try again in a minute." },
        { status: 429 },
      ),
    } as const;
  return { sb, user } as const;
}
