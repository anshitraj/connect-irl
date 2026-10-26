import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { connectionEmail } from "./connection-email";
import { unsubscribeUrl } from "./unsubscribe";

const claimed = z.array(
  z.object({
    receiptId: z.uuid(),
    recipientId: z.uuid(),
    email: z.email(),
    actor: z.object({
      name: z.string(),
      username: z.string().regex(/^[a-z0-9][a-z0-9_-]+$/),
      headline: z.string().optional(),
      avatar: z.string().optional(),
    }),
  }),
);

/**
 * Emails the people whose profile `actorId` just saved. The database function decides who
 * is eligible (public profiles, no blocks, confirmed address, opted in) and marks each
 * receipt as emailed in the same statement, so concurrent syncs never send twice.
 * Anything that fails is logged without personal data and never affects the caller.
 */
export async function notifyNewConnections(actorId: string) {
  const resendKey = process.env.RESEND_API_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!resendKey || !serviceKey || !url) return 0;
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  const from = process.env.EMAIL_FROM || "Connect IRL <hello@connectirl.xyz>";
  try {
    const { data, error } = await admin.rpc("claim_connection_emails", {
      actor: actorId,
    });
    if (error) throw error;
    const rows = claimed.parse(data ?? []);
    const results = await Promise.allSettled(
      rows.map(async (row) => {
        const link = unsubscribeUrl(row.recipientId);
        const mail = connectionEmail({
          actor: row.actor,
          unsubscribeUrl: link,
        });
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `connection-receipt-${row.receiptId}`,
          },
          body: JSON.stringify({
            from,
            to: [row.email],
            subject: mail.subject,
            html: mail.html,
            text: mail.text,
            headers: {
              "List-Unsubscribe": `<${link}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) {
          // Free the receipt so the next sync from this person retries it.
          await admin
            .from("connection_receipts")
            .update({ emailed_at: null })
            .eq("id", row.receiptId);
          throw new Error(`Resend responded ${response.status}`);
        }
      }),
    );
    for (const result of results)
      if (result.status === "rejected")
        console.error("Connection email failed:", String(result.reason));
    return results.filter((result) => result.status === "fulfilled").length;
  } catch (error) {
    console.error("Connection emails unavailable:", String(error));
    return 0;
  }
}
