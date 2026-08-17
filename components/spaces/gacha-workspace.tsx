import { ChevronDown, Gamepad2, Pencil, Plus } from "lucide-react";

import { DeleteItemForm } from "@/components/spaces/delete-item-form";
import { ResourceForm } from "@/components/spaces/resource-form";
import { ResourceSection } from "@/components/spaces/resource-section";
import type { CrudResource, SpaceCrudConfig } from "@/lib/space-crud";
import type { CrudRow, RelationOption, ResourceData } from "@/lib/space-data";

export function GachaWorkspace({
  config,
  relationOptions,
  resourcesData,
}: {
  config: SpaceCrudConfig;
  relationOptions: Record<string, RelationOption[]>;
  resourcesData: ResourceData[];
}) {
  const gamesResource = config.resources.find((resource) => resource.key === "games");
  const eventsResource = config.resources.find((resource) => resource.key === "events");
  const charactersResource = config.resources.find((resource) => resource.key === "targets");
  const gamesData = resourcesData.find((resource) => resource.resourceKey === "games");
  const eventsData = resourcesData.find((resource) => resource.resourceKey === "events");
  const charactersData = resourcesData.find((resource) => resource.resourceKey === "targets");

  if (!gamesResource || !eventsResource || !charactersResource) {
    return null;
  }

  return (
    <div className="space-y-6">
      {gamesData?.status === "error" ? (
      <p className="rounded-xl bg-[var(--orbit-surface)] p-5 text-sm text-[var(--orbit-danger)]">
          No se pudieron cargar tus juegos. Recarga la página e inténtalo otra vez.
        </p>
      ) : gamesData?.items.length ? (
        <div className="space-y-4">
          {gamesData.items.map((game, index) => (
            <GameWorkspace
              charactersData={charactersData}
              charactersResource={charactersResource}
              defaultOpen={index === 0}
              eventsData={eventsData}
              eventsResource={eventsResource}
              game={game}
              gamesResource={gamesResource}
              key={game.id}
              relationOptions={relationOptions}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-[var(--orbit-surface)] p-5 text-sm leading-6 text-[var(--orbit-muted)]">
          Crea tu primer juego. Después podrás agregarle eventos y personajes sin salir de aquí.
        </div>
      )}
    </div>
  );
}

export function GachaGameCreator({ config, relationOptions }: {
  config: SpaceCrudConfig;
  relationOptions: Record<string, RelationOption[]>;
}) {
  const gamesResource = config.resources.find((resource) => resource.key === "games");
  if (!gamesResource) return null;

  return (
    <details className="group space-canvas__add-resource">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--orbit-accent)]">
        <span className="flex items-center gap-2"><Plus aria-hidden="true" className="size-4 text-[var(--space-glow)]" />Añadir juego</span>
        <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-[var(--orbit-line)] p-4">
        <ResourceForm mode="create" relationOptions={relationOptions} resource={gamesResource} space="gacha" />
      </div>
    </details>
  );
}

function GameWorkspace({
  charactersData,
  charactersResource,
  defaultOpen,
  eventsData,
  eventsResource,
  game,
  gamesResource,
  relationOptions,
}: {
  charactersData?: ResourceData;
  charactersResource: CrudResource;
  defaultOpen: boolean;
  eventsData?: ResourceData;
  eventsResource: CrudResource;
  game: CrudRow;
  gamesResource: CrudResource;
  relationOptions: Record<string, RelationOption[]>;
}) {
  const gameEvents = eventsData?.items.filter((item) => item.game_id === game.id) ?? [];
  const gameCharacters =
    charactersData?.items.filter((item) => item.game_id === game.id) ?? [];
  const gameRelationOptions = {
    ...relationOptions,
    events: gameEvents.map((event) => ({
      label: String(event.title || "Evento"),
      value: event.id,
    })),
  };
  const color = typeof game.color === "string" ? game.color : undefined;

  return (
    <article className="overflow-hidden rounded-xl bg-[var(--orbit-surface)]">
      <details className="group/game" open={defaultOpen}>
        <summary className="flex min-h-20 cursor-pointer list-none items-center gap-4 px-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--orbit-accent)] sm:px-5">
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-lg bg-[var(--orbit-background)] text-[var(--orbit-accent)]"
            style={color ? { color } : undefined}
          >
            <Gamepad2 className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-lg font-semibold">
              {String(game.name || "Juego")}
            </span>
            <span className="mt-0.5 block text-sm text-[var(--orbit-muted)]">
              {gameEvents.length} {gameEvents.length === 1 ? "evento" : "eventos"} ·{" "}
              {gameCharacters.length} {gameCharacters.length === 1 ? "personaje" : "personajes"}
            </span>
          </span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open/game:rotate-180" />
        </summary>

        <div className="space-y-8 border-t border-[var(--orbit-line)] p-4 sm:p-5">
          <details className="group/edit rounded-lg bg-[var(--orbit-background)]">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--orbit-accent)]">
              <span className="flex items-center gap-2">
                <Pencil aria-hidden="true" className="size-4" />
                Editar juego
              </span>
              <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open/edit:rotate-180" />
            </summary>
            <div className="border-t border-[var(--orbit-line)] p-4">
              <ResourceForm
                initialValues={game}
                mode="edit"
                relationOptions={relationOptions}
                resource={gamesResource}
                space="gacha"
              />
              <div className="mt-5 border-t border-[var(--orbit-line)] pt-3">
                <DeleteItemForm
                  confirmationMessage="¿Eliminar este juego y todos sus eventos y personajes? Esta acción no se puede deshacer."
                  id={game.id}
                  resource={gamesResource.key}
                  space="gacha"
                />
              </div>
            </div>
          </details>

          <ResourceSection
            data={{
              items: gameEvents,
              resourceKey: eventsResource.key,
              status: eventsData?.status ?? "error",
            }}
            fixedValues={{ game_id: game.id }}
            hiddenFieldKeys={["game_id"]}
            nested
            relationOptions={gameRelationOptions}
            resource={eventsResource}
            sectionId={`${game.id}-events`}
            space="gacha"
          />

          <ResourceSection
            data={{
              items: gameCharacters,
              resourceKey: charactersResource.key,
              status: charactersData?.status ?? "error",
            }}
            fixedValues={{ game_id: game.id }}
            hiddenFieldKeys={["game_id"]}
            nested
            relationOptions={gameRelationOptions}
            resource={charactersResource}
            sectionId={`${game.id}-characters`}
            space="gacha"
          />
        </div>
      </details>
    </article>
  );
}
