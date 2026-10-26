import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { esc } from "@/lib/email/layout";
import { validUnsubscribe } from "@/lib/email/unsubscribe";

const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} · Connect IRL</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#f1f6f2;color:#101713;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}main{max-width:440px;width:100%;background:#fff;border:1px solid #dce7df;border-radius:20px;padding:36px 32px;text-align:center}h1{margin:0 0 10px;font-size:26px;line-height:1.2}p{margin:0 0 22px;color:#52625a}button,a.b{display:inline-block;border:0;border-bottom:4px solid #08b96c;border-radius:14px;background:#053d2b;color:#fff;padding:14px 28px;font:700 16px/1.2 inherit;text-decoration:none;cursor:pointer}a.t{color:#07894f}</style></head><body><main>${body}</main></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'",
      },
    },
  );

const invalid = () =>
  page(
    "Link expired",
    `<h1>This link doesn&rsquo;t work</h1><p>Open Settings in Connect IRL to manage your email preferences.</p><a class="b" href="/app">Open Connect IRL</a>`,
    400,
  );

// Mail scanners prefetch links, so GET only asks for confirmation; POST changes state.
// POST also serves RFC 8058 one-click unsubscribe from mail clients.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const user = params.get("u");
  const token = params.get("t");
  if (!validUnsubscribe(user, token)) return invalid();
  return page(
    "Email preferences",
    `<h1>Turn off connection emails?</h1><p>You&rsquo;ll still see new connections inside Connect IRL. We just won&rsquo;t email you when someone saves your profile.</p><form method="post"><input type="hidden" name="u" value="${esc(user!)}"><input type="hidden" name="t" value="${esc(token!)}"><button type="submit">Turn off emails</button></form>`,
  );
}

export async function POST(request: Request) {
  const params = new URL(request.url).searchParams;
  const form = await request.formData().catch(() => null);
  const field = (name: string) =>
    params.get(name) ?? (form?.get(name)?.toString() || null);
  const user = field("u");
  const token = field("t");
  const enable = field("action") === "resubscribe";
  if (!validUnsubscribe(user, token) || !z.uuid().safeParse(user).success)
    return invalid();
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { error } = await admin
    .from("users")
    .update({ connection_emails: enable })
    .eq("id", user!);
  if (error)
    return page(
      "Something went wrong",
      `<h1>That didn&rsquo;t save</h1><p>Please try again in a moment.</p>`,
      503,
    );
  return enable
    ? page(
        "Emails back on",
        `<h1>Connection emails are back on</h1><p>We&rsquo;ll email you when someone saves your profile.</p><a class="b" href="/app">Open Connect IRL</a>`,
      )
    : page(
        "Unsubscribed",
        `<h1>You&rsquo;re unsubscribed</h1><p>We won&rsquo;t send connection emails any more. Changed your mind?</p><form method="post"><input type="hidden" name="u" value="${esc(user!)}"><input type="hidden" name="t" value="${esc(token!)}"><input type="hidden" name="action" value="resubscribe"><button type="submit">Turn them back on</button></form>`,
      );
}
