import { createHmac, timingSafeEqual } from "node:crypto";
import { SITE_URL } from "./layout";

// Unsubscribe links must work from an email client with no session, so they carry an
// HMAC of the account id. The server-only service key is the signing secret.
const sign = (userId: string) =>
  createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY || "")
    .update(`connection-emails:${userId}`)
    .digest("base64url");

export const unsubscribeUrl = (userId: string) =>
  `${SITE_URL}/api/email/unsubscribe?u=${userId}&t=${sign(userId)}`;

export function validUnsubscribe(userId: string | null, token: string | null) {
  if (!userId || !token || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  const expected = Buffer.from(sign(userId));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
