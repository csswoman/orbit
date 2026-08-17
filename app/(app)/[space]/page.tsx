import { connection } from "next/server";
import { notFound } from "next/navigation";

import { SpaceWorkspace } from "@/components/spaces/space-workspace";
import { getCrudConfig } from "@/lib/space-crud";
import { getSpaceWorkspace } from "@/lib/space-data";
import { getSpaceCanvas } from "@/lib/space-widgets";
import { getSpace, spaces } from "@/lib/spaces";

export function generateStaticParams() {
  return spaces.map((space) => ({ space: space.slug }));
}

export default async function SpacePage({
  params,
}: {
  params: Promise<{ space: string }>;
}) {
  const { space: slug } = await params;
  const space = getSpace(slug);
  const config = getCrudConfig(slug);

  if (!space || !config) {
    notFound();
  }

  await connection();
  const [data, canvas] = await Promise.all([
    getSpaceWorkspace(slug),
    getSpaceCanvas(slug),
  ]);

  return (
    <section className="space-page">
      <SpaceWorkspace
        config={config}
        relationOptions={data.relationOptions}
        resourcesData={data.resources}
        preference={canvas.preference}
        space={slug}
        widgets={canvas.widgets}
      />
    </section>
  );
}
