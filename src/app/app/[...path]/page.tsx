import { WorkspacePage } from "@/components/workspace-page";
export default async function Page({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  return <WorkspacePage path={path} />;
}
