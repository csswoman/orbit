import { connection } from "next/server";
import { notFound } from "next/navigation";

import { SpaceWorkspace } from "@/components/spaces/space-workspace";
import { getOrbitItems } from "@/lib/orbit-items";
import { getOrbitSpace } from "@/lib/orbit-spaces";
import { getCrudConfig } from "@/lib/space-crud";
import { getSpaceWorkspace } from "@/lib/space-data";
import { getCanvasPreference } from "@/lib/space-widgets";

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

  const [data, preference, items] = await Promise.all([
    getSpaceWorkspace(space.id, space.kind),
    getCanvasPreference(space.id),
    getOrbitItems(space.id),
  ]);

  return (
    <section className="space-page canvas-page">
      <SpaceWorkspace
        config={config}
        items={items}
        kind={space.kind}
        name={space.name}
        preference={preference}
        relationOptions={data.relationOptions}
        resourcesData={data.resources}
        space={space.id}
        spaceDetails={space}
      />
    </section>
  );
}
