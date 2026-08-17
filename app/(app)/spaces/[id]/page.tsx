import { connection } from "next/server";
import { notFound } from "next/navigation";

import { SpaceWorkspace } from "@/components/spaces/space-workspace";
import { getCrudConfig } from "@/lib/space-crud";
import { getSpaceWorkspace } from "@/lib/space-data";
import { getOrbitSpace } from "@/lib/orbit-spaces";
import { getSpaceCanvas } from "@/lib/space-widgets";

export default async function ConfigurableSpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connection();
  const space = await getOrbitSpace(id);
  if (!space) notFound();

  const config = getCrudConfig(space.kind);
  if (!config) notFound();

  const [data, canvas] = await Promise.all([
    getSpaceWorkspace(space.id, space.kind),
    getSpaceCanvas(space.id),
  ]);

  return (
    <section className="space-page canvas-page">
      <SpaceWorkspace
        config={config}
        kind={space.kind}
        name={space.name}
        spaceDetails={space}
        relationOptions={data.relationOptions}
        resourcesData={data.resources}
        preference={canvas.preference}
        space={space.id}
        widgets={canvas.widgets}
      />
    </section>
  );
}
