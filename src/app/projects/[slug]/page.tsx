import { ProjectDetail } from "@/components/discovery";
import { PublicShell } from "@/components/public-shell";
import { publicProject } from "@/lib/public-data";
import type { Metadata } from "next";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const p = await publicProject((await params).slug);
  return {
    title: p?.name || "Builder project",
    description: p?.tagline || "Find your next “let’s build”.",
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PublicShell>
      <div className="public-project-wrap">
        <ProjectDetail slug={slug} initial={await publicProject(slug)} />
      </div>
    </PublicShell>
  );
}
