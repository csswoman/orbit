import "server-only";

import { redirect } from "next/navigation";

import { getCrudConfig, type SpaceKind } from "@/lib/space-crud";
import { createClient } from "@/lib/supabase/server";

export type CrudRow = Record<string, unknown> & { id: string };

export type ResourceData = {
  items: CrudRow[];
  resourceKey: string;
  status: "error" | "success";
};

export type RelationOption = {
  label: string;
  value: string;
};

export type SpaceWorkspaceData = {
  relationOptions: Record<string, RelationOption[]>;
  resources: ResourceData[];
};

export async function getSpaceWorkspace(
  spaceId: string,
  kind: SpaceKind,
): Promise<SpaceWorkspaceData> {
  const config = getCrudConfig(kind);

  if (!config) {
    return { relationOptions: {}, resources: [] };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const resourceResults = await Promise.all(
    config.resources.map(async (resource): Promise<ResourceData> => {
      const { data, error } = await supabase
        .from(resource.table)
        .select("*")
        .eq("user_id", userId)
        .eq("space_id", spaceId)
        .order(resource.orderBy, {
          ascending: resource.orderDirection !== "desc",
          nullsFirst: false,
        });

      return {
        items: error ? [] : ((data ?? []) as CrudRow[]),
        resourceKey: resource.key,
        status: error ? "error" : "success",
      };
    }),
  );

  const relationOptions: Record<string, RelationOption[]> = {};

  for (const resourceData of resourceResults) {
    const resource = config.resources.find(
      (candidate) => candidate.key === resourceData.resourceKey,
    );
    const labelField = config.resources
      .flatMap((candidate) => candidate.fields)
      .find(
        (field) => field.optionsFrom?.resource === resourceData.resourceKey,
      )?.optionsFrom?.labelField;

    if (resource && labelField) {
      relationOptions[resource.key] = resourceData.items.map((item) => ({
        label: String(item[labelField] || resource.singular),
        value: item.id,
      }));
    }
  }

  if (kind === "gacha" && relationOptions.events) {
    const gamesById = new Map(
      (relationOptions.games ?? []).map((game) => [game.value, game.label]),
    );
    const eventData = resourceResults.find(
      (resource) => resource.resourceKey === "events",
    );
    relationOptions.events = (eventData?.items ?? []).map((item) => ({
      label: `${gamesById.get(String(item.game_id)) ?? "Juego"} · ${String(item.title || "Evento")}`,
      value: item.id,
    }));
  }

  if (kind === "inspiration") {
    const { data } = await supabase
      .from("projects")
      .select("id, title")
      .eq("user_id", userId)
      .eq("space_id", spaceId)
      .order("title", { ascending: true });

    relationOptions.projects = ((data ?? []) as CrudRow[]).map((item) => ({
      label: String(item.title || "Proyecto"),
      value: item.id,
    }));
  }

  return { relationOptions, resources: resourceResults };
}
