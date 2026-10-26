import type { User } from "@supabase/supabase-js";
// The photo and sign-in method from the account provider (Google or X). Used as a
// fallback when the profile has no photo of its own.
export function accountPhoto(user: User | null): string {
  const meta = user?.user_metadata;
  const url =
    typeof meta?.avatar_url === "string"
      ? meta.avatar_url
      : typeof meta?.picture === "string"
        ? meta.picture
        : "";
  return url.startsWith("https://") ? url : "";
}
export function accountProvider(user: User | null): string {
  const provider = user?.app_metadata?.provider;
  if (provider === "google") return "Google";
  if (provider === "x" || provider === "twitter") return "X";
  if (provider === "github") return "GitHub";
  return "Email";
}
