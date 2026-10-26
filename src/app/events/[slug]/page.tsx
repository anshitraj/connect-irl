import { EventDetail } from "@/components/events-directory";
import { PublicShell } from "@/components/public-shell";
import { events } from "@/lib/events";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const e = events.find((e) => e.slug === slug);
  return { title: e?.name || "Event", description: e?.description };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const e = events.find((e) => e.slug === slug);
  if (!e) notFound();
  return (
    <PublicShell>
      <div className="public-project-wrap">
        <EventDetail event={e} />
      </div>
    </PublicShell>
  );
}
