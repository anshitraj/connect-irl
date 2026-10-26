import { PublicProfile } from "@/components/profile";
import { PublicShell } from "@/components/public-shell";
import { publicProfile } from "@/lib/public-data";
import { sampleProfiles } from "@/lib/samples";
import type { Metadata } from "next";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const p = await publicProfile(username);
  return {
    title: p ? p.name : "Builder profile",
    description: p?.headline || "A new hello. A lasting connection.",
    robots: username.startsWith("demo-")
      ? { index: false, follow: false }
      : undefined,
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const initial = username.startsWith("demo-")
    ? sampleProfiles.find((p) => p.username === username) || null
    : await publicProfile(username);
  return (
    <PublicShell>
      <PublicProfile initial={initial} username={username} />
    </PublicShell>
  );
}
