import { notFound, redirect } from "next/navigation";

import { getCrudConfig } from "@/lib/space-crud";
import { getOrbitSpaces } from "@/lib/orbit-spaces";

export default async function SpacePage({
  params,
}: {
  params: Promise<{ space: string }>;
}) {
  const { space: slug } = await params;
  const config = getCrudConfig(slug);

  if (!config) {
    notFound();
  }

  const space = (await getOrbitSpaces()).find(
    (candidate) => candidate.kind === slug && candidate.isPrebuilt,
  );
  if (!space) notFound();
  redirect(`/spaces/${space.id}`);
}
