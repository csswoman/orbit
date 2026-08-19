import { getDeadlineTiming } from "@/lib/dashboard-dates";

type UpcomingState =
  | { items: { due_date: string; id: string; title: string }[]; status: "success" }
  | { status: "error" };

export function HomeUpcoming({ state }: { state: UpcomingState }) {
  return (
    <section aria-labelledby="home-upcoming-title" className="home-upcoming">
      <h2 id="home-upcoming-title">Próximo</h2>
      {state.status === "error" ? (
        <p>No se pudieron cargar los plazos.</p>
      ) : state.items.length === 0 ? (
        <p>Nada en los próximos 7 días</p>
      ) : (
        <ul>
          {state.items.map((item) => (
            <li key={item.id}>
              <span>{item.title}</span>
              <span>{getDeadlineTiming(item.due_date).label}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
