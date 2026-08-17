import {
  AlertCircle,
  Apple,
  CalendarClock,
  Gamepad2,
  Repeat2,
} from "lucide-react";

import type { DeadlineItem } from "@/lib/dashboard";
import { getCalendarParts, getDeadlineTiming } from "@/lib/dashboard-dates";

type UpcomingState =
  | { items: DeadlineItem[]; status: "success" }
  | { status: "error" };

const sourceMeta = {
  food_item: { icon: Apple, label: "Comida" },
  gacha_event: { icon: Gamepad2, label: "Gacha" },
  subscription: { icon: Repeat2, label: "Suscripción" },
};

export function UpcomingSection({
  now,
  state,
}: {
  now: Date;
  state: UpcomingState;
}) {
  return (
    <section aria-labelledby="upcoming-title" className="dashboard-panel orbit-widget orbit-widget--schedule p-5 sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock
              aria-hidden="true"
              className="size-5 text-[var(--orbit-accent)]"
            />
            <h2 id="upcoming-title" className="text-xl font-semibold tracking-[-0.02em]">
              Próximo
            </h2>
          </div>
          <p className="mt-1 text-sm text-[var(--orbit-muted)]">
            Vencidos activos y próximos 7 días
          </p>
        </div>
        {state.status === "success" && state.items.length > 0 ? (
          <span className="rounded-full bg-[var(--orbit-accent-soft)] px-3 py-1 text-sm font-medium text-[var(--orbit-accent-strong)]">
            {state.items.length}
          </span>
        ) : null}
      </header>

      {state.status === "error" ? (
        <InlineState
          description="No pudimos leer deadlines. Revisa que la migración esté aplicada y recarga la página."
          title="Upcoming no está disponible"
        />
      ) : state.items.length === 0 ? (
        <InlineState
          description="Cuando agregues eventos, comida o suscripciones con fecha, aparecerán aquí automáticamente."
          title="Nada urgente en los próximos 7 días"
        />
      ) : (
        <ul className="mt-5 divide-y divide-[var(--orbit-line)]">
          {state.items.map((item) => (
            <DeadlineRow item={item} key={item.id} now={now} />
          ))}
        </ul>
      )}
    </section>
  );
}

function DeadlineRow({ item, now }: { item: DeadlineItem; now: Date }) {
  const { day, month } = getCalendarParts(item.due_date);
  const timing = getDeadlineTiming(item.due_date, now);
  const meta = sourceMeta[item.space_type];
  const Icon = meta.icon;

  return (
    <li className="flex gap-3 py-4 first:pt-1 last:pb-0 sm:gap-4">
      <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-[var(--orbit-background)] leading-none">
        <span className="text-base font-semibold">{day}</span>
        <span className="mt-1 text-[0.6875rem] text-[var(--orbit-muted)]">
          {month}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.title}</p>
        <div className="mt-1 flex items-center gap-1.5 text-sm text-[var(--orbit-muted)]">
          <Icon aria-hidden="true" className="size-3.5" />
          <span>{meta.label}</span>
          {item.is_recurring ? <span>· Recurrente</span> : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2 text-right">
        <span className={`deadline-timing deadline-timing--${timing.tone}`}>
          {timing.label}
        </span>
        <span
          aria-hidden="true"
          className="size-2 rounded-full bg-[var(--orbit-accent)]"
          style={item.color ? { backgroundColor: item.color } : undefined}
        />
      </div>
    </li>
  );
}

function InlineState({ description, title }: { description: string; title: string }) {
  return (
    <div className="mt-8 flex gap-3 rounded-xl bg-[var(--orbit-background)] p-4">
      <AlertCircle
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
