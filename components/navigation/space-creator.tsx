"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import { useState } from "react";

import { createOrbitSpace } from "@/app/(app)/space-management-actions";

const spaceKinds = [
  { icon: "gamepad", kind: "gacha", label: "Gacha" },
  { icon: "apple", kind: "food", label: "Comida" },
  { icon: "repeat", kind: "subscriptions", label: "Suscripciones" },
  { icon: "heart", kind: "wishlist", label: "Lista de deseos" },
  { icon: "shirt", kind: "clothing", label: "Ropa" },
  { icon: "luggage", kind: "travel", label: "Viajes" },
  { icon: "tag", kind: "sales", label: "Ventas" },
  { icon: "folder-kanban", kind: "projects", label: "Proyectos" },
  { icon: "sparkles", kind: "inspiration", label: "Inspiración" },
] as const;

type SpaceKind = (typeof spaceKinds)[number]["kind"];

export function SpaceCreator({ onCreated }: { onCreated?: () => void }) {
  const [kind, setKind] = useState<SpaceKind>(spaceKinds[0]?.kind ?? "gacha");
  const [pickerOpen, setPickerOpen] = useState(false);
  const selected = spaceKinds.find((space) => space.kind === kind) ?? spaceKinds[0];

  return (
    <details className="group mt-3 border-t border-white/10 pt-3">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-lg px-3 text-sm font-medium text-[var(--orbit-nav-text)] hover:bg-[var(--orbit-nav-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orbit-accent)]">
        <Plus aria-hidden="true" className="size-[1.125rem]" />
        Nuevo espacio
      </summary>
      <form
        action={createOrbitSpace}
        className="space-y-3 px-3 pb-2 pt-3"
        onKeyDown={(event) => {
          if (event.key === "Escape") setPickerOpen(false);
        }}
        onSubmit={onCreated}
      >
        <label className="block text-xs font-medium text-[var(--orbit-nav-muted)]">
          Nombre
          <input className="mt-1 min-h-10 w-full rounded-md border border-white/15 bg-black/15 px-2 text-sm text-[var(--orbit-nav-text)] outline-none focus:border-[var(--orbit-accent)]" defaultValue={selected?.label} key={kind} name="name" required />
        </label>
        <div className="text-xs font-medium text-[var(--orbit-nav-muted)]">
          <span id="space-structure-label">Usa la estructura de</span>
          <input name="kind" type="hidden" value={kind} />
          <button
            aria-controls="space-structure-options"
            aria-expanded={pickerOpen}
            aria-labelledby="space-structure-label space-structure-value"
            className="mt-1 flex min-h-11 w-full items-center justify-between rounded-md border border-white/15 bg-black/15 px-3 text-left text-sm font-semibold text-[var(--orbit-nav-text)] transition-colors duration-150 hover:border-white/30 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orbit-accent)]"
            onClick={() => setPickerOpen((open) => !open)}
            type="button"
          >
            <span id="space-structure-value">{selected?.label}</span>
            <ChevronDown aria-hidden="true" className={`size-4 shrink-0 transition-transform duration-150 ${pickerOpen ? "rotate-180" : ""}`} />
          </button>
          {pickerOpen ? (
            <div
              aria-labelledby="space-structure-label"
              className="mt-2 grid grid-cols-2 gap-1 rounded-md border border-white/15 bg-[color-mix(in_oklch,var(--orbit-sidebar)_92%,black)] p-1.5 shadow-[0_6px_8px_color-mix(in_oklch,var(--orbit-background)_42%,transparent)]"
              id="space-structure-options"
            >
              {spaceKinds.map((space) => {
                const isSelected = space.kind === kind;

                return (
                  <button
                    className={`flex min-h-10 min-w-0 items-center gap-1.5 rounded px-2 text-left text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orbit-accent)] ${
                      isSelected
                        ? "bg-[var(--orbit-accent)] text-white"
                        : "text-[var(--orbit-nav-text)] hover:bg-[var(--orbit-nav-hover)]"
                    }`}
                    key={space.kind}
                    onClick={() => {
                      setKind(space.kind);
                      setPickerOpen(false);
                    }}
                    type="button"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {space.label}
                      {isSelected ? <span className="sr-only">, seleccionada</span> : null}
                    </span>
                    {isSelected ? <Check aria-hidden="true" className="size-3.5 shrink-0" /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <input name="icon" type="hidden" value={selected?.icon ?? "sparkles"} />
        <p className="text-xs leading-5 text-[var(--orbit-nav-muted)]">Tendrá sus propios datos; no se mezclará con los demás spaces.</p>
        <button className="min-h-10 rounded-md bg-[var(--orbit-accent)] px-3 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" type="submit">Crear espacio</button>
      </form>
    </details>
  );
}
