import { GachaGameCreator, GachaWorkspace } from "@/components/spaces/gacha-workspace";
import { ResourceSection } from "@/components/spaces/resource-section";
import { SpaceCanvas } from "@/components/spaces/space-canvas";
import type { SpaceCrudConfig } from "@/lib/space-crud";
import type { RelationOption, ResourceData } from "@/lib/space-data";
import type { CanvasPreference, SpaceWidget } from "@/lib/space-widgets";

export function SpaceWorkspace({
  config,
  relationOptions,
  resourcesData,
  preference,
  space,
  widgets,
}: {
  config: SpaceCrudConfig;
  relationOptions: Record<string, RelationOption[]>;
  resourcesData: ResourceData[];
  preference: CanvasPreference;
  space: string;
  widgets: SpaceWidget[];
}) {
  if (space === "gacha") {
    return (
      <SpaceCanvas
        adjustmentContent={<GachaGameCreator config={config} relationOptions={relationOptions} />}
        preference={preference}
        space={space}
        widgets={widgets}
      >
        <GachaWorkspace
          config={config}
          relationOptions={relationOptions}
          resourcesData={resourcesData}
        />
      </SpaceCanvas>
    );
  }

  return (
    <SpaceCanvas preference={preference} space={space} widgets={widgets}>
      {config.resources.map((resource) => {
        const data = resourcesData.find(
          (candidate) => candidate.resourceKey === resource.key,
        );

        return (
          <ResourceSection
            data={data}
            key={resource.key}
            relationOptions={relationOptions}
            resource={resource}
            space={space}
          />
        );
      })}
    </SpaceCanvas>
  );
}
