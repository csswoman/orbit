import { GachaGameCreator, GachaWorkspace } from "@/components/spaces/gacha-workspace";
import { ResourceSection } from "@/components/spaces/resource-section";
import { SpaceCanvas } from "@/components/spaces/space-canvas";
import type { SpaceCrudConfig, SpaceKind } from "@/lib/space-crud";
import type { RelationOption, ResourceData } from "@/lib/space-data";
import type { OrbitSpace } from "@/lib/orbit-spaces";
import type { CanvasPreference, SpaceWidget } from "@/lib/space-widgets";

export function SpaceWorkspace({
  config,
  kind,
  name,
  spaceDetails,
  relationOptions,
  resourcesData,
  preference,
  space,
  widgets,
}: {
  config: SpaceCrudConfig;
  kind: SpaceKind;
  name: string;
  spaceDetails: OrbitSpace;
  relationOptions: Record<string, RelationOption[]>;
  resourcesData: ResourceData[];
  preference: CanvasPreference;
  space: string;
  widgets: SpaceWidget[];
}) {
  return (
    <>
      <h1 className="sr-only">{name}</h1>
      <SpaceCanvas
        adjustmentContent={
          kind === "gacha" ? (
            <GachaGameCreator config={config} relationOptions={relationOptions} space={space} />
          ) : undefined
        }
        preference={preference}
        space={space}
        spaceDetails={spaceDetails}
        widgets={widgets}
      >
        {kind === "gacha" ? (
          <GachaWorkspace
            config={config}
            relationOptions={relationOptions}
            resourcesData={resourcesData}
            space={space}
          />
        ) : (
          config.resources.map((resource) => {
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
          })
        )}
      </SpaceCanvas>
    </>
  );
}
