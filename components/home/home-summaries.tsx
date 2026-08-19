import type { HomeSummaries as HomeSummariesData } from "@/lib/home-summaries";

type Summaries = Exclude<HomeSummariesData, null>;

export function HomeSummaries({ summaries }: { summaries: Summaries }) {
  return (
    <nav aria-label="Recuentos" className="home-summaries">
      <a href={summaries.travel.href}>
        Viajes · {summaries.travel.pending} pendientes · {summaries.travel.ready} listas
      </a>
      <a href={summaries.sales.href}>
        Ventas · {summaries.sales.available} disponibles · {summaries.sales.sold} vendidas
      </a>
      <a href={summaries.jobs.href}>
        Trabajo · {summaries.jobs.active} activas · {summaries.jobs.interview} en entrevista
      </a>
    </nav>
  );
}
