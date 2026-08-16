import { ArrowUpRight, FolderKanban, Lightbulb, Sparkles } from "lucide-react";

import { openResurfaceItem } from "@/app/(app)/dashboard-actions";
import type { ResurfaceItem } from "@/lib/dashboard";
import { getStalenessLabel } from "@/lib/dashboard-dates";

type ResurfaceState =
  | { items: ResurfaceItem[]; status: "success" }
  | { status: "error" };

export function ResurfaceSection({
  now,
  state,
}: {
  now: Date;
  state: ResurfaceState;
}) {
  return (
    <section
      aria-labelledby="resurface-title"
      className="dashboard-panel overflow-hidden"
    >
      <header className="p-5 pb-4 sm:p-6 sm:pb-5">
        <div className="flex items-center gap-2">
          <Sparkles
            aria-hidden="true"
            className="size-5 text-[var(--orbit-accent)]"
          />
          <h2 id="resurface-title" className="text-xl font-semibold tracking-[-0.02em]">
            Resurface
          </h2>
        </div>
        <p className="mt-1 text-sm text-[var(--orbit-muted)]">
          Ideas que llevan más tiempo fuera de vista
        </p>
      </header>

      {state.status === "error" ? (
        <ResurfaceState
          description="No pudimos mezclar proyectos e inspiración. Confirma que la vista resurface_items exista."
          title="Resurface no está disponible"
        />
      ) : state.items.length === 0 ? (
        <ResurfaceState
          description="Guarda un proyecto o una inspiración. Orbit empezará a traer de vuelta primero lo menos visto."
          title="Todavía no hay ideas para redescubrir"
        />
      ) : (
        <ul className="divide-y divide-[var(--orbit-line)]">
          {state.items.map((item, index) => (
            <ResurfaceRow featured={index === 0} item={item} key={item.id} now={now} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ResurfaceRow({
  featured,
  item,
  now,
}: {
  featured: boolean;
  item: ResurfaceItem;
  now: Date;
}) {
  const Icon = item.item_type === "project" ? FolderKanban : Lightbulb;
  const safeImageUrl = item.image_url?.replaceAll('"', "%22");

  return (
    <li className={featured ? "bg-[var(--orbit-accent-soft)]" : undefined}>
      <form action={openResurfaceItem}>
        <input name="id" type="hidden" value={item.id} />
        <input name="itemType" type="hidden" value={item.item_type} />
        <button
          className={`group flex min-h-24 w-full items-center gap-4 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--orbit-accent)] sm:px-6 ${
            featured ? "sm:min-h-36" : "hover:bg-[var(--orbit-background)]"
          }`}
          type="submit"
        >
          <span
            aria-hidden="true"
            className={`grid shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--orbit-background)] text-[var(--orbit-accent)] ${
              featured ? "size-20 sm:size-24" : "size-14"
            }`}
            style={
              safeImageUrl
                ? {
                    backgroundImage: `url("${safeImageUrl}")`,
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                  }
                : undefined
            }
          >
            {safeImageUrl ? null : <Icon className="size-6" />}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--orbit-muted)]">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-[var(--orbit-accent)]"
                style={item.color ? { backgroundColor: item.color } : undefined}
              />
              {item.item_type === "project" ? "Proyecto" : "Inspiración"}
              <span>·</span>
              <span>{getStalenessLabel(item.last_viewed_at, now)}</span>
            </span>
            <span
              className={`mt-1 block font-semibold tracking-[-0.015em] ${
                featured ? "text-lg sm:text-xl" : "truncate"
              }`}
            >
              {item.title}
            </span>
            {item.summary ? (
              <span className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--orbit-muted)]">
                {item.summary}
              </span>
            ) : null}
          </span>

          <ArrowUpRight
            aria-hidden="true"
            className="size-5 shrink-0 text-[var(--orbit-muted)] transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </button>
      </form>
    </li>
  );
}

function ResurfaceState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="m-5 mt-1 flex gap-3 rounded-xl bg-[var(--orbit-background)] p-4 sm:m-6 sm:mt-1">
      <Lightbulb
        aria-hidden="true"
        className="mt-0.5 size-5 shrink-0 text-[var(--orbit-accent)]"
      />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm leading-6 text-[var(--orbit-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}
